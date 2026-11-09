import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Roadmap from "./pages/Roadmap";
import DSA from "./pages/DSA";
import People from "./pages/People";
import Profile from "./pages/Profile";
import AuthPage from "./pages/AuthPage";
import Companies from "./pages/Companies";
import Applications from "./pages/Applications";
import RoadmapInvite from "./pages/RoadmapInvite";

function PrivateLayout({ children }) {
  return <ProtectedRoute><Layout/></ProtectedRoute>;
}
export default function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/login" element={<AuthPage mode="login"/>}/>
    <Route path="/register" element={<AuthPage mode="register"/>}/>
    <Route element={<ProtectedRoute><Layout/></ProtectedRoute>}>
      <Route index element={<Dashboard/>}/>
      <Route path="/roadmap" element={<Roadmap/>}/>
      <Route path="/companies" element={<Companies/>}/>
      <Route path="/applications" element={<Applications/>}/>
      <Route path="/dsa" element={<DSA/>}/>
      <Route path="/people" element={<People/>}/>
      <Route path="/profile/:username" element={<Profile/>}/>
      <Route path="/roadmap-invite/:token" element={<RoadmapInvite/>}/>
    </Route>
    <Route path="*" element={<AuthPage mode="login"/>}/>
  </Routes></AuthProvider></BrowserRouter>;
}
