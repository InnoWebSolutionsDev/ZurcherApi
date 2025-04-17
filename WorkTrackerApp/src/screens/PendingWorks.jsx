import React, { useState, useEffect, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Calendar } from "react-native-calendars";
import Toast from "react-native-toast-message";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorks, updateWork } from "../Redux/Actions/workActions";
import { fetchStaff } from "../Redux/Actions/staffActions";
import { sendEmailNotification } from "../utils/sendNotification"; // Asegúrate de tener esta función para enviar correos electrónicos
import { showNotification } from "../utils/notificationService";

const PendingWorks = () => {
    const dispatch = useDispatch();
    const { works, loading: worksLoading } = useSelector((state) => state.work);
    const { staff, loading: staffLoading } = useSelector((state) => state.staff);

    const [selectedWork, setSelectedWork] = useState(null);
    const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const flatListRef = useRef(null);

    useEffect(() => {
        dispatch(fetchWorks());
        dispatch(fetchStaff());
    }, [dispatch]);

    const handleAssign = async () => {
        if (!selectedWork || !selectedStaff) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Por favor selecciona un trabajo y un miembro del staff.",
            });
            return;
        }
    
        const formattedDate = new Date(startDate).toISOString().split('T')[0]; // Formatear la fecha
    
        try {
            // Actualizar el trabajo en el backend
            await dispatch(
                updateWork(selectedWork.idWork, {
                    startDate: formattedDate,
                    staffId: selectedStaff.id,
                    status: "assigned",
                })
            );
    
            Toast.show({
                type: "success",
                text1: "Éxito",
                text2: "Trabajo asignado correctamente.",
            });

            showNotification(
                "Trabajo Asignado",
                `El trabajo en ${selectedWork.propertyAddress} ha sido asignado a ${selectedStaff.name}.`
            );
    
            // Enviar correo al miembro del staff asignado
            const subject = "Trabajo Asignado";
            const message = `Se te ha asignado el trabajo en ${selectedWork.propertyAddress} para la fecha ${formattedDate}.`;
            await sendEmailNotification(selectedStaff.email, subject, message);
    
            // Obtener correos del staff con rol "recept"
            const receptStaff = staff.filter((member) => member.role === "recept");
            const receptEmails = receptStaff.map((member) => member.email);
    
            if (receptEmails.length > 0) {
                // Enviar correo a los receptores
                const receptMessage = `Hay una compra de materiales pendiente para el trabajo en ${selectedWork.propertyAddress}. Los materiales se necesitan para la fecha ${formattedDate}.`;
                await sendEmailNotification(receptEmails.join(','), "Compra de Materiales Pendiente", receptMessage);
            }
    
            setSelectedWork(null);
            setSelectedStaff(null);
            dispatch(fetchWorks());
        } catch (error) {
            console.error("Error al asignar el trabajo:", error);
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Hubo un error al asignar el trabajo.",
            });
        }
    };

    const confirmSelection = (member) => {
        Alert.alert(
            "Confirm Selection",
            `Are you sure you want to assign this work to ${member.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Yes",
                    onPress: () => {
                        setSelectedStaff(member);
                        handleAssign();
                    },
                },
            ]
        );
    };

    const handleScrollEnd = (event) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const itemWidth = 100; // Ancho estimado de cada elemento
        const index = Math.round(offsetX / itemWidth);
        if (staff[index]) {
            setSelectedStaff(staff[index]);
        }
    };

    if (worksLoading || staffLoading) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Cargando datos...</Text>
            </View>
        );
    }

    const pendingWorks = works.filter((work) => work.status === "pending");

    const renderListFooter = () => {
        if (!selectedWork) return null; // No mostrar si no hay trabajo seleccionado

        return (
            <>
                <Text style={styles.subtitle}>Select a date:</Text>
                <Calendar
                    onDayPress={(day) => setStartDate(day.dateString)}
                    minDate={new Date().toISOString().split("T")[0]}
                    markedDates={{
                        [startDate]: { selected: true, marked: true, selectedColor: "#80d4ff" },
                    }}
                    style={styles.calendar} // Añadir estilo si es necesario
                />
                <Text style={styles.subtitle}>Assign to a staff member:</Text>
                <FlatList
                    ref={flatListRef}
                    data={staff}
                    keyExtractor={(item) => item.id.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.staffList}
                    onMomentumScrollEnd={handleScrollEnd}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.staffItem,
                                selectedStaff?.id === item.id && styles.selectedStaffItem,
                            ]}
                            onPress={() => confirmSelection(item)}
                        >
                            <Text style={styles.staffName}>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                />
            </>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <View style={styles.leftSection}>
                    {/* Usa FlatList como contenedor principal */}
                    <FlatList
                        data={pendingWorks}
                        keyExtractor={(item) => item.idWork.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.workItem,
                                    selectedWork?.idWork === item.idWork && styles.selectedWorkItem,
                                ]}
                                onPress={() => setSelectedWork(item)}
                            >
                                <Text>{item.propertyAddress} - {item.status}</Text>
                            </TouchableOpacity>
                        )}
                        // Cabecera de la lista
                        ListHeaderComponent={
                            <Text style={styles.subtitle}>Select an address:</Text>
                        }
                        // Pie de la lista (se renderiza solo si hay trabajo seleccionado via renderListFooter)
                        ListFooterComponent={renderListFooter} 
                        // Componente a mostrar si la lista está vacía
                        ListEmptyComponent={
                            <Text style={styles.noWorksText}>No pending works</Text>
                        }
                        // Añade algo de padding inferior si es necesario
                        contentContainerStyle={{ paddingBottom: 20 }} 
                    />
                </View>
            </View>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#f9f9f9",
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 16,
        textAlign: "center",
        color: "#333",
        textTransform: "uppercase",
    },
    row: {
        flexDirection: "row",
        gap: 16,
    },
    leftSection: {
        flex: 1,
        backgroundColor: "#ffffff",
        // Quita el padding de aquí si lo pones en FlatList o sus componentes
        // padding: 16, 
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3, // Para Android
        // Asegúrate de que leftSection pueda contener la FlatList
        overflow: 'hidden', // Puede ayudar a contener los elementos hijos
    },
    calendar: {
        marginBottom: 10, // Añade margen al calendario si es necesario
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
    },


    noWorksText: {
        fontSize: 16,
        color: "#888",
        textAlign: "center",
        textTransform: "uppercase",
        
    },
    subtitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginVertical: 8,
        color: "#555",
        
    },
    workItem: {
        padding: 12,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2, // Para Android
    },
    selectedWorkItem: {
        backgroundColor: "#e6f7ff",
        borderColor: "#80d4ff",
    },
    staffList: {
        alignItems: "center",
        marginVertical: 16,
    },
    staffItem: {
        width: 100,
        height: 100,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 8,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 12,
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3, // Para Android
    },
    selectedStaffItem: {
        backgroundColor: "#e6f7ff", // Mismo color que las direcciones seleccionadas
        borderColor: "#80d4ff", // Mismo borde que las direcciones seleccionadas
        borderWidth: 2,
    },
    staffName: {
        fontSize: 12,
        textAlign: "center",
        color: "#333",
        textTransform: "uppercase",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
});

export default PendingWorks;