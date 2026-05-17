import { redirect } from "next/navigation";

export default function NewClientRedirect() {
	redirect("/admin/clients?new=1");
}
