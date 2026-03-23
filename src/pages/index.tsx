import Layout from "./Layout.jsx";

import Landing from "./Landing";

import Dashboard from "./Dashboard";

import Projects from "./Projects";

import CreateProject from "./CreateProject";

import Store from "./Store";

import Services from "./Services";

import Support from "./Support";

import SellerDashboard from "./SellerDashboard";

import UserManagement from "./UserManagement";

import MyOrders from "./MyOrders";

import ProjectDetail from "./ProjectDetail";

import ProductDetail from "./ProductDetail";

import ServiceDetail from "./ServiceDetail";

import Profile from "./Profile";

import Register from "./Register";

import AdminRequestForm from "./AdminRequestForm";

import AdminCompleteRegister from "./AdminCompleteRegister";

import ZoneManagement from "./ZoneManagement";

import JoinZone from "./JoinZone";

import Login from "./Login";

import AppSettings from "./AppSettings";

import AuditLogs from "./AuditLogs";

import FinancialReport from "./FinancialReport";

import News from "./News";

import PaymentSuccess from "./PaymentSuccess";
import PaymentCancel from "./PaymentCancel";

import About from "./About";

import CompanyNews from "./CompanyNews";

import PrivacyTerms from "./PrivacyTerms";

import Accessibility from "./Accessibility";

import Sustainability from "./Sustainability";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { useActivityTracker } from '@/hooks/useActivityTracker';

const PAGES: Record<string, React.ComponentType> = {

    Landing: Landing,

    Dashboard: Dashboard,

    Projects: Projects,

    CreateProject: CreateProject,

    Store: Store,

    Services: Services,

    Support: Support,

    SellerDashboard: SellerDashboard,

    UserManagement: UserManagement,

    MyOrders: MyOrders,

    ProjectDetail: ProjectDetail,

    ProductDetail: ProductDetail,

    ServiceDetail: ServiceDetail,

    Profile: Profile,

    Register: Register,

    AdminRequestForm: AdminRequestForm,

    AdminCompleteRegister: AdminCompleteRegister,

    ZoneManagement: ZoneManagement,

    Login: Login,

    AppSettings: AppSettings,

    AuditLogs: AuditLogs,

    FinancialReport: FinancialReport,

    News: News,

    About: About,

    CompanyNews: CompanyNews,

    PrivacyTerms: PrivacyTerms,

    Accessibility: Accessibility,

    Sustainability: Sustainability,

}

function _getCurrentPage(url: string): string {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop() ?? '';
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    useActivityTracker();

    return (
        <Layout currentPageName={currentPage}>
            <Routes>

                    <Route path="/" element={<Landing />} />


                <Route path="/Landing" element={<Landing />} />

                <Route path="/Dashboard" element={<Dashboard />} />

                <Route path="/Projects" element={<Projects />} />
                <Route path="/CreateProject" element={<CreateProject />} />
                <Route path="/createproject" element={<CreateProject />} />

                <Route path="/Store" element={<Store />} />

                <Route path="/Services" element={<Services />} />

                <Route path="/Support" element={<Support />} />

                <Route path="/SellerDashboard" element={<SellerDashboard />} />

                <Route path="/UserManagement" element={<UserManagement />} />

                <Route path="/MyOrders" element={<MyOrders />} />

                <Route path="/ProjectDetail" element={<ProjectDetail />} />
                <Route path="/projectdetail" element={<ProjectDetail />} />

                <Route path="/ProductDetail" element={<ProductDetail />} />
                <Route path="/productdetail" element={<ProductDetail />} />

                <Route path="/ServiceDetail" element={<ServiceDetail />} />
                <Route path="/servicedetail" element={<ServiceDetail />} />

                <Route path="/Profile" element={<Profile />} />

                <Route path="/Register" element={<Register />} />

                <Route path="/Login" element={<Login />} />

                <Route path="/AdminRequestForm" element={<AdminRequestForm />} />

                <Route path="/AdminCompleteRegister" element={<AdminCompleteRegister />} />

                <Route path="/ZoneManagement" element={<ZoneManagement />} />

                <Route path="/InviteLinks" element={<ZoneManagement />} />
                <Route path="/join/:code" element={<JoinZone />} />

                <Route path="/AppSettings" element={<AppSettings />} />
                <Route path="/appsettings" element={<AppSettings />} />
                <Route path="/AuditLogs" element={<AuditLogs />} />
                <Route path="/auditlogs" element={<AuditLogs />} />

                <Route path="/FinancialReport" element={<FinancialReport />} />
                <Route path="/financialreport" element={<FinancialReport />} />

                <Route path="/News" element={<News />} />

                <Route path="/payment/success" element={<PaymentSuccess />} />
                <Route path="/payment/cancel" element={<PaymentCancel />} />
                <Route path="/news" element={<News />} />

                <Route path="/About" element={<About />} />
                <Route path="/about" element={<About />} />
                <Route path="/CompanyNews" element={<CompanyNews />} />
                <Route path="/companynews" element={<CompanyNews />} />
                <Route path="/PrivacyTerms" element={<PrivacyTerms />} />
                <Route path="/privacyterms" element={<PrivacyTerms />} />
                <Route path="/Accessibility" element={<Accessibility />} />
                <Route path="/accessibility" element={<Accessibility />} />
                <Route path="/Sustainability" element={<Sustainability />} />
                <Route path="/sustainability" element={<Sustainability />} />

            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
