import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const BarraLateral = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentStaff: staff } = useSelector((state) => state.auth);

  // New state to manage open sections
  const [openSections, setOpenSections] = useState({});

  const menuSections = [
    {
      name: "Work Management",
      items: [
        { name: "Works", path: "/works" },
        { name: "Tracking Work", path: "/check" },
        { name: "Progress", path: "/progress-tracker" },
        { name: "Calendar", path: "/workCalendar" },
      ],
    },
    {
      name: "Budgets & Permits",
      items: [
        { name: "Upload Permits", path: "/pdf" },
        { name: "Budgets", path: "/budgets" },
        { name: "Items Budgets", path: "/itemBudget" },
        { name: "Edit Budgets", path: "/editBudget" },
        {name : "Gestion Budgets", path: "/gestionBudgets"},
        { name: "BudgetsEnd", path: "/archive" },
      ],
    },
    {
      name: "Financial",
      items: [
        { name: "Initial Pay", path: "/initialPay" },
        { name: "Upload Vouchers", path: "/attachInvoice" },
        { name: "Balance", path: "/balance" },
        { name: "Income & Expenses", path: "/summary" },
      ],
    },
    {
      name: "Administration",
      items: [
        { name: "Materials", path: "/materiales" },
        { name: "Send Message", path: "/send-notifications" },
        { name: "Staff", path: "/register" },
        { name: "Dashboard", path: "/dashboard" },
      ],
    },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };
  
  const toggleSection = (sectionName) => {
    setOpenSections(prevOpenSections => ({
      ...prevOpenSections,
      [sectionName]: !prevOpenSections[sectionName],
    }));
  };
  
  const handleMobileNavigation = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  if (staff?.role !== "owner") {
    return null;
  }

  const renderMenuItems = (isMobile) => (
    menuSections.map((section) => (
      <div key={section.name} className="w-full">
        <button
          onClick={() => toggleSection(section.name)}
          className="flex items-center justify-between w-full py-3 px-4 text-sm md:text-base font-medium transition-all duration-300 text-left hover:bg-gray-700 hover:text-blue-300 focus:outline-none"
        >
          <span className="truncate">{section.name}</span>
          <span className="text-lg ml-2 flex-shrink-0">{openSections[section.name] ? "−" : "+"}</span>
        </button>
        {openSections[section.name] && (
          <ul className="pl-6 bg-gray-900">
            {section.items.map((item) => (
              <li key={item.name} className="w-full">
                <button
                  onClick={() => isMobile ? handleMobileNavigation(item.path) : handleNavigation(item.path)}
                  className={`block py-2 px-3 text-xs md:text-sm font-medium transition-all duration-300 w-full text-left hover:bg-gray-600 hover:text-blue-200 rounded-md mx-1 my-1 ${
                    location.pathname === item.path ? "bg-gray-600 text-blue-200" : ""
                  }`}
                >
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    ))
  );

  return (
    <div className="flex">
      {/* Desktop/Tablet Sidebar */}
      <div className="hidden md:flex flex-col bg-gray-800 text-white w-56 lg:w-64 h-screen fixed z-30 shadow-lg">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-center">Navigation</h2>
        </div>
        <ul className="flex flex-col mt-2 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {renderMenuItems(false)}
        </ul>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden">
        <button
          className="fixed top-20 left-4 z-50 bg-gray-800 text-white p-2 rounded-lg shadow-lg focus:outline-none transition-transform duration-200 hover:scale-105"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <div className="w-4 h-4 flex flex-col justify-around">
            <span className={`block h-0.5 w-4 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-2.5' : ''}`}></span>
            <span className={`block h-0.5 w-4 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block h-0.5 w-4 bg-white transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-2.5' : ''}`}></span>
          </div>
        </button>

        {/* Mobile Sidebar */}
        <div className={`fixed top-0 left-0 w-80 h-screen bg-gray-800 text-white z-40 transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } shadow-2xl`}>
          <div className="p-4 pt-20 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-center">Menu</h2>
          </div>
          <ul className="flex flex-col mt-2 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            {renderMenuItems(true)}
          </ul>
        </div>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}
      </div>

      {/* Content Spacer for Desktop */}
      <div className="hidden md:block w-56 lg:w-64 flex-shrink-0"></div>
    </div>
  );
};

export default BarraLateral;