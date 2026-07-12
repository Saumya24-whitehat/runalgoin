import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminAuditLog() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/admin?section=audit", { replace: true });
  }, [navigate]);
  return null;
}
