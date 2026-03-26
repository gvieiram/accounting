import { ImageResponse } from "next/og";
import { company } from "@/content/company";
import { messages } from "@/content/messages";

export const alt = messages.home.metadata.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				alignItems: "center",
				background:
					"linear-gradient(135deg, #1a3a37 0%, #274f4a 50%, #1a3a37 100%)",
				fontFamily: "sans-serif",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "24px",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "baseline",
						gap: "4px",
					}}
				>
					<span
						style={{
							fontSize: 72,
							fontWeight: 700,
							color: "#ffffff",
							letterSpacing: "-2px",
						}}
					>
						{company.brand.displayNameProps.duo}
					</span>
					<span
						style={{
							fontSize: 72,
							fontWeight: 700,
							color: "#d9988a",
							letterSpacing: "-2px",
						}}
					>
						{company.brand.displayNameProps.hub}
					</span>
				</div>

				<div
					style={{
						width: 80,
						height: 2,
						background: "#d9988a",
					}}
				/>

				<span
					style={{
						fontSize: 28,
						color: "rgba(255,255,255,0.7)",
						letterSpacing: "6px",
						textTransform: "uppercase",
					}}
				>
					{company.brand.subtitle}
				</span>

				<span
					style={{
						fontSize: 22,
						color: "rgba(255,255,255,0.5)",
						marginTop: "16px",
						maxWidth: "700px",
						textAlign: "center",
						lineHeight: 1.5,
					}}
				>
					{messages.home.metadata.description}
				</span>

				<div
					style={{
						display: "flex",
						marginTop: "24px",
						padding: "14px 36px",
						borderRadius: "999px",
						background: "#d9988a",
						color: "#1a3a37",
						fontSize: 20,
						fontWeight: 600,
						letterSpacing: "0.5px",
					}}
				>
					{messages.common.actions.talkOnWhatsapp}
				</div>
			</div>

			<div
				style={{
					position: "absolute",
					bottom: 40,
					display: "flex",
					alignItems: "center",
					gap: "8px",
					color: "rgba(255,255,255,0.35)",
					fontSize: 16,
				}}
			>
				<span>{company.siteUrl.replace("https://", "")}</span>
			</div>
		</div>,
		{ ...size },
	);
}
