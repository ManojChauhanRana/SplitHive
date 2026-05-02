import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Login } from './pages/Auth/Login';
import { Signup } from './pages/Auth/Signup';
import { AcceptInvite } from './pages/Auth/AcceptInvite';
import { Groups } from './pages/Groups/Groups';
import { GroupDetail } from './pages/Groups/GroupDetail';
import { AddExpense } from './pages/Expenses/AddExpense';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard/Dashboard';


function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/groups" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Groups />
                </Layout>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/groups/:groupId" 
            element={
              <ProtectedRoute>
                <Layout>
                  <GroupDetail />
                </Layout>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/groups/:groupId/add" 
            element={
              <ProtectedRoute>
                <Layout>
                  <AddExpense />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
