import { session } from "../lib/store";
import { useNavigate, useParams } from "@solidjs/router";
import { JSX } from "solid-js";

export default function ProjectLayout({children}: {children?: JSX.Element}) {
  const navigate = useNavigate();
  const params = useParams();
  const isClientMode = () => !!params.token_id;

  if (!isClientMode()) {
    let hasSession = false;
    try { hasSession = !!session(); } catch { /* session resource errored (e.g. getMe 401) */ }
    if (!hasSession) {
      navigate('/login', { replace: true });
      return null;
    }
  }
  return (
    <div class="p-5">
      {children}
    </div>
  );
}
