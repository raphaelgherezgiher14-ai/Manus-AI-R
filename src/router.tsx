import {
  RedirectIfAuthed,
  RequireRole,
} from "@/components/shared/route-guards";

import Index from "./pages/Index";
import Login from "./pages/login";
import Signup from "./pages/signup";
import Welcome from "./pages/welcome";
import FindInvoice from "./pages/find-invoice";
import Success from "./pages/success";
import Cancel from "./pages/cancel";
import NotFound from "./pages/NotFound";
import PublicDocument from "./pages/public/document";
import { LegalImprint, LegalPrivacy, LegalTerms } from "./pages/legal";

// Business portal
import { AppLayout } from "./pages/app/app-layout";
import AppDashboard from "./pages/app/dashboard";
import Customers from "./pages/app/customers";
import CustomerDetail from "./pages/app/customer-detail";
import Quotes from "./pages/app/quotes";
import QuoteNew from "./pages/app/quote-new";
import QuoteDetail from "./pages/app/quote-detail";
import Projects from "./pages/app/projects";
import ProjectNew from "./pages/app/project-new";
import ProjectDetail from "./pages/app/project-detail";
import Invoices from "./pages/app/invoices";
import InvoiceDetail from "./pages/app/invoice-detail";
import InvoicePrint from "./pages/app/invoice-print";
import Payments from "./pages/app/payments";
import Reminders from "./pages/app/reminders";
import Dunning from "./pages/app/dunning";
import Cashflow from "./pages/app/cashflow";
import Messages from "./pages/app/messages";
import Documents from "./pages/app/documents";
import Settings from "./pages/app/settings";

// Admin portal
import { AdminLayout } from "./pages/admin/admin-layout";
import AdminDashboard from "./pages/admin/dashboard";
import AdminUsers from "./pages/admin/users";
import AdminRoles from "./pages/admin/roles";
import AdminCompanies from "./pages/admin/companies";
import AdminSubscriptions from "./pages/admin/subscriptions";
import AdminDeadlineCalendar from "./pages/admin/deadline-calendar";
import AdminInvoiceManagement from "./pages/admin/invoice-management";
import AdminPayments from "./pages/admin/payments";
import { AiAnalyst } from "./pages/admin/ai-analyst";
import { AdminCustomers, AdminProjects, AdminQuotes, AdminInvoices } from "./pages/admin/resources";
import { AdminPaymentMethods, AdminIntegrations } from "./pages/admin/payment-methods";
import AdminAnalytics from "./pages/admin/analytics";
import AdminAudit from "./pages/admin/audit";
import AdminSettings from "./pages/admin/settings";

export const routers = [
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/login",
    element: (
      <RedirectIfAuthed>
        <Login />
      </RedirectIfAuthed>
    ),
  },
  {
    path: "/signup",
    element: (
      <RedirectIfAuthed>
        <Signup />
      </RedirectIfAuthed>
    ),
  },
  {
    path: "/welcome",
    element: <Welcome />,
  },
  {
    path: "/success",
    element: <Success />,
  },
  {
    path: "/cancel",
    element: <Cancel />,
  },
  {
    path: "/impressum",
    element: <LegalImprint />,
  },
  {
    path: "/datenschutz",
    element: <LegalPrivacy />,
  },
  {
    path: "/agb",
    element: <LegalTerms />,
  },

  /* Public magic link: one document, no login */
  {
    path: "/i/:token",
    element: <PublicDocument />,
  },

  /* Public invoice lookup by number + email */
  {
    path: "/rechnung-finden",
    element: <FindInvoice />,
  },

  /* Print-optimized invoice view (own document, no app shell) */
  {
    path: "/app/invoices/:id/print",
    element: (
      <RequireRole role="business">
        <InvoicePrint />
      </RequireRole>
    ),
  },

  /* ---------------- Business portal /app ---------------- */
  {
    path: "/app",
    element: (
      <RequireRole role="business">
        <AppLayout />
      </RequireRole>
    ),
    children: [
      { index: true, element: <AppDashboard /> },
      { path: "customers", element: <Customers /> },
      { path: "customers/:id", element: <CustomerDetail /> },
      { path: "quotes", element: <Quotes /> },
      { path: "quotes/new", element: <QuoteNew /> },
      { path: "quotes/:id", element: <QuoteDetail /> },
      { path: "projects", element: <Projects /> },
      { path: "projects/new", element: <ProjectNew /> },
      { path: "projects/:id", element: <ProjectDetail /> },
      { path: "invoices", element: <Invoices /> },
      { path: "invoices/:id", element: <InvoiceDetail /> },
      { path: "payments", element: <Payments /> },
      { path: "reminders", element: <Reminders /> },
      { path: "dunning", element: <Dunning /> },
      { path: "cashflow", element: <Cashflow /> },
      { path: "messages", element: <Messages /> },
      { path: "documents", element: <Documents /> },
      { path: "settings", element: <Settings /> },
    ],
  },

  /* ---------------- Admin portal /admin ---------------- */
  {
    path: "/admin",
    element: (
      <RequireRole role="admin">
        <AdminLayout />
      </RequireRole>
    ),
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "users", element: <AdminUsers /> },
      { path: "roles", element: <AdminRoles /> },
      { path: "companies", element: <AdminCompanies /> },
      { path: "customers", element: <AdminCustomers /> },
      { path: "projects", element: <AdminProjects /> },
      { path: "quotes", element: <AdminQuotes /> },
      { path: "invoices", element: <AdminInvoices /> },
      { path: "calendar", element: <AdminDeadlineCalendar /> },
      { path: "invoice-management", element: <AdminInvoiceManagement /> },
      { path: "payments", element: <AdminPayments /> },
      { path: "analyst", element: <AiAnalyst /> },
      { path: "subscriptions", element: <AdminSubscriptions /> },
      { path: "payment-methods", element: <AdminPaymentMethods /> },
      { path: "integrations", element: <AdminIntegrations /> },
      { path: "analytics", element: <AdminAnalytics /> },
      { path: "audit", element: <AdminAudit /> },
      { path: "settings", element: <AdminSettings /> },
    ],
  },

  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  {
    path: "*",
    element: <NotFound />,
  },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
