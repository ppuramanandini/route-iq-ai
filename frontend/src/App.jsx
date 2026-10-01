import React, { useState, useEffect } from "react";
import { SimProvider } from "./context/SimContext";
import { Layout } from "./components/Layout";
import { SignIn } from "./pages/SignIn";
import { CommandCenter } from "./pages/CommandCenter";
import { LiveRouting } from "./pages/LiveRouting";
import { GatewayHealth } from "./pages/GatewayHealth";
import { AiAgents } from "./pages/AiAgents";
import { Simulator } from "./pages/Simulator";
import { Transactions } from "./pages/Transactions";
import { Recovery } from "./pages/Recovery";
import { AutonomousRecovery } from "./pages/AutonomousRecovery";
import { Analytics } from "./pages/Analytics";
import { AuditTrail } from "./pages/AuditTrail";
import { Developer } from "./pages/Developer";
import { Settings } from "./pages/Settings";

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => {
    return window.location.pathname === "/" ? "/command-center" : window.location.pathname;
  });

  const [hasSession, setHasSession] = useState(() => {
    return Boolean(sessionStorage.getItem("sriq_session"));
  });

  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname;
      setCurrentPath(path);
      setHasSession(Boolean(sessionStorage.getItem("sriq_session")));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigateTo = (path) => {
    if (path === "/") {
      sessionStorage.removeItem("sriq_session");
      setHasSession(false);
      setCurrentPath("/");
      window.history.pushState({}, "", "/");
      return;
    }
    setHasSession(true);
    setCurrentPath(path);
    window.history.pushState({}, "", path);
  };

  const handleSignInSuccess = (targetPath = "/command-center") => {
    setHasSession(true);
    navigateTo(targetPath);
  };

  // If path is root or no session, show Sign In page
  if (currentPath === "/" || !hasSession) {
    return <SignIn onSignInSuccess={handleSignInSuccess} />;
  }

  const renderPage = () => {
    switch (currentPath) {
      case "/command-center":
        return <CommandCenter />;
      case "/live-routing":
        return <LiveRouting />;
      case "/gateways":
        return <GatewayHealth />;
      case "/agents":
        return <AiAgents />;
      case "/simulator":
        return <Simulator />;
      case "/transactions":
        return <Transactions />;
      case "/recovery":
        return <Recovery />;
      case "/autonomous-recovery":
        return <AutonomousRecovery />;
      case "/analytics":
        return <Analytics />;
      case "/audit":
        return <AuditTrail />;
      case "/developer":
        return <Developer />;
      case "/settings":
        return <Settings />;
      default:
        return <CommandCenter />;
    }
  };

  return (
    <SimProvider>
      <Layout currentPath={currentPath} onNavigate={navigateTo}>
        {renderPage()}
      </Layout>
    </SimProvider>
  );
}
