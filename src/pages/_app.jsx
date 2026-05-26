import "../styles/globals.css";
import { AuthProvider } from "../context/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";
import Layout from "../components/Layout";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isLogin = router.pathname === "/login";

  return (
    <AuthProvider>
      {isLogin ? (
        <Component {...pageProps} />
      ) : (
        <ProtectedRoute>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </ProtectedRoute>
      )}
    </AuthProvider>
  );
}
