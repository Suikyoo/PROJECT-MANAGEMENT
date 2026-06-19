import { session } from "../lib/store";
import { useNavigate, useParams } from "@solidjs/router";
import { JSX } from "solid-js";

export default function ProjectLayout({children}: {children?: JSX.Element}) {
  const navigate = useNavigate();
  const params = useParams();

  // Always check session — for client mode, skip the guard since auth is via token_id
  if (!params.token_id) {
    let hasSession = false;
    try { hasSession = !!session(); } catch { /* session resource errored (e.g. getMe 401) */ }
    if (!hasSession) {
      navigate('/login', { replace: true });
      return null;
    }
  }

  return (
    <div class="h-screen overflow-y-scroll flex flex-col">
        {children}
    </div>
  );
}
