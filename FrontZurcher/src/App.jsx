import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { restoreSession } from "./Redux/Actions/authActions";
import PrivateRoute from "./Components/PrivateRoute";
import Header from "./Components/Header";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Importa tus componentes
import Login from "./Components/Auth/Login";
import Register from "./Components/Auth/Register";
import Dashboard from "./Components/Dashboard/Dashboard";
import Seguimiento from "./Components/Seguimiento/Seguimiento";
import NotFound from "./Components/NotFound";
import Unauthorized from "./Components/Auth/Unauthorized";
import Landing from "./Components/Landing";
import PdfReceipt from "./Components/PdfReceipt";
import BarraLateral from "./Components/Dashboard/BarraLateral";
import BudgetList from "./Components/Budget/BudgetList";
import Works from "./Components/Works/Work";
import ProgressTracker from "./Components/ProgressTracker";
import WorkDetail from "./Components/Works/WorkDetail";
import Materiales from "./Components/Materiales";
import MaterialsCheck from "./Components/Seguimiento/WorkStatusManager";
import SendNotification from "./Components/SendNotification";
import Notifications from "./Components/Notifications";
import InstallationForm from "./Components/Works/InstalationForm";
import BudgetEditor from "./Components/Budget/BudgetEditor";
import ForgotPassword from "./Components/Auth/ForgotPassword";
import ResetPassword from "./Components/Auth/ResetPassword";
import ArchveBudget from "./Components/Budget/ArchiveBudget";
import FileDetail from "./Components/Budget/FileDetail";
import PendingWorks from "./Components/Works/PendingWorks";
import AttachInvoice from "./Components/Seguimiento/AttachInvoice";
import VerImagenes from "./Components/Works/VerImagenes";

function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { isAuthenticated } = useSelector((state) => state.auth);
  const [isSessionRestored, setIsSessionRestored] = useState(false);

  useEffect(() => {
    dispatch(restoreSession()).finally(() => setIsSessionRestored(true));
  }, [dispatch]);

  useEffect(() => {
    // Redirigir al dashboard si el usuario está autenticado y está en la página de login o landing
    if (isAuthenticated && location.pathname === "/") {
      navigate("/progress-tracker");
    }
  }, [isAuthenticated, location.pathname, navigate]);

  if (!isSessionRestored) {
    return <div>Cargando...</div>; // Indicador de carga
  }

  return (
    <>
      {isAuthenticated && <Header />}
      <div className={`flex ${isAuthenticated ? "pt-20" : ""}`}>
        {isAuthenticated && <BarraLateral />}
        <div className="flex-1">
          <Routes>
            {/* Ruta pública */}
            <Route path="/" element={<Landing />} />

            {/* Rutas privadas */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute allowedRoles={["owner", "admin"]}>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/firststage"
              element={
                <PrivateRoute allowedRoles={["owner", "recept"]}>
                  <firstStage />
                </PrivateRoute>
              }
            />
            <Route
              path="/progress-tracker"
              element={
                <PrivateRoute allowedRoles={["owner", "admin", "user"]}>
                  <ProgressTracker />
                </PrivateRoute>
              }
            />
            <Route
              path="/seguimiento"
              element={
                <PrivateRoute allowedRoles={["owner", "admin", "user"]}>
                  <Seguimiento />
                </PrivateRoute>
              }
            />
            <Route
              path="/works"
              element={
                <PrivateRoute allowedRoles={["owner", "admin", "user"]}>
                  <Works />
                </PrivateRoute>
              }
            />
            <Route
              path="/work/:idWork"
              element={
                <PrivateRoute allowedRoles={["owner", "admin", "user"]}>
                  <WorkDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/workCalendar"
              element={
                <PrivateRoute allowedRoles={["owner", "admin", "user"]}>
                  <PendingWorks />
                </PrivateRoute>
              }
            />
            <Route
              path="/installation"
              element={
                <PrivateRoute
                  allowedRoles={["owner", "admin", "user", "worker"]}
                >
                  <InstallationForm />
                </PrivateRoute>
              }
            />
            <Route
              path="/materiales"
              element={
                <PrivateRoute allowedRoles={["owner", "admin", "user"]}>
                  <Materiales />
                </PrivateRoute>
              }
            />
            <Route
              path="/inspecciones"
              element={
                <PrivateRoute allowedRoles={["owner", "admin", "user"]}>
                  <MaterialsCheck />
                </PrivateRoute>
              }
            />
            <Route
              path="/budgets"
              element={
                <PrivateRoute allowedRoles={["owner", "admin", "user"]}>
                  <BudgetList />
                </PrivateRoute>
              }
            />
            <Route
              path="/pdf"
              element={
                <PrivateRoute allowedRoles={["owner", "admin", "user"]}>
                  <PdfReceipt />
                </PrivateRoute>
              }
            />
            <Route
              path="/editBudget/:budgetId"
              element={
                <PrivateRoute allowedRoles={["owner", "admin", "user"]}>
                  <BudgetEditor />
                </PrivateRoute>
              }
            />
            <Route
              path="/archive"
              element={
                <PrivateRoute allowedRoles={["owner", "admin", "user"]}>
                  <ArchveBudget />
                </PrivateRoute>
              }
            />
            <Route path="/archives/:folder/:file" element={<FileDetail />} />
            <Route
              path="/send-notifications"
              element={
                <PrivateRoute
                  allowedRoles={["owner", "recept", "worker", "admin"]}
                >
                  <SendNotification />
                </PrivateRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <PrivateRoute
                  allowedRoles={["owner", "recept", "worker", "admin"]}
                >
                  <Notifications />
                </PrivateRoute>
              }
            />
            <Route
              path="/attachInvoice"
              element={
                <PrivateRoute
                  allowedRoles={["owner", "recept", "worker", "admin"]}
                >
                  <AttachInvoice />
                </PrivateRoute>
              }
            />
            <Route path="/ver-imagenes/:idWork" element={<VerImagenes />} />
            {/* Rutas de autenticación */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Ruta por defecto para 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
      <ToastContainer />
    </>
  );
}

export default App;