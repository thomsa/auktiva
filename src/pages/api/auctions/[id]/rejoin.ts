import { createHandler, withAuth } from "@/lib/api";
import { memberHandlers } from "@/lib/api/handlers";

export default createHandler({
  POST: [[withAuth], memberHandlers.rejoinAuction],
});
