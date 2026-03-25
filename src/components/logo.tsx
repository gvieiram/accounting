"use client";

import { motion, type Variants } from "framer-motion";
import { company } from "@/content/company";
import { cn } from "@/lib/utils";
import { useFlag } from "@/stores/use-flags-store";

const EASING: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const LETTERS = [
	{
		char: company.brand.displayName.split("")[0],
		color: "text-primary",
		delay: 0.6,
	},
	{
		char: company.brand.displayName.split("")[1],
		color: "text-primary",
		delay: 0.66,
	},
	{
		char: company.brand.displayName.split("")[2],
		color: "text-primary",
		delay: 0.72,
	},
	{
		char: company.brand.displayName.split("")[3],
		color: "text-highlight",
		delay: 0.82,
	},
	{
		char: company.brand.displayName.split("")[4],
		color: "text-highlight",
		delay: 0.88,
	},
	{
		char: company.brand.displayName.split("")[5],
		color: "text-highlight",
		delay: 0.94,
	},
];

const logoVariants: Variants = {
	hidden: { opacity: 0, scale: 3 },
	visible: {
		opacity: 1,
		scale: 1,
		transition: {
			duration: 0.5,
			ease: EASING,
			opacity: { duration: 0.2 },
		},
	},
};

const textRevealVariants: Variants = {
	hidden: { width: 0 },
	visible: {
		width: "auto",
		transition: { delay: 0.5, duration: 0.4, ease: EASING },
	},
};

const letterVariants: Variants = {
	hidden: { opacity: 0, x: 24 },
	visible: (delay: number) => ({
		opacity: 1,
		x: 0,
		transition: { delay, duration: 0.3, ease: EASING },
	}),
};

const subtitleWrapVariants: Variants = {
	hidden: { height: 0 },
	visible: {
		height: "auto",
		transition: { delay: 1.2, duration: 0.35, ease: EASING },
	},
};

const subtitleVariants: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: { delay: 1.3, duration: 0.4, ease: EASING },
	},
};

const SIZE_PRESETS = {
	sm: { logo: 28, text: "text-lg", subtitle: "text-[0.45rem]" },
	md: { logo: 30, text: "text-xl", subtitle: "text-[0.55rem]" },
	lg: { logo: 38, text: "text-2xl", subtitle: "text-xs" },
} as const;

type LogoSize = keyof typeof SIZE_PRESETS;

type LogoProps = {
	className?: string;
	size?: LogoSize;
	subtitleClassName?: string;
	showSubtitle?: boolean;
	animated?: boolean;
};

export function Logo({
	className,
	size = "md",
	subtitleClassName,
	showSubtitle = true,
	animated = true,
}: LogoProps) {
	const { logo, text, subtitle } = SIZE_PRESETS[size];
	const { isLogoTextCentered } = useFlag();

	return (
		<motion.div
			className={cn("flex items-center gap-2", className)}
			initial={animated ? "hidden" : "visible"}
			animate="visible"
			aria-label={company.brand.name}
		>
			<motion.div variants={logoVariants}>
				<LogoIcon size={logo} />
			</motion.div>
			<div
				className={cn("flex flex-col", isLogoTextCentered && "items-center")}
			>
				<motion.div variants={textRevealVariants} className="overflow-hidden">
					<span
						className={cn(
							"flex select-none whitespace-nowrap font-logo font-semibold tracking-wide",
							text,
						)}
					>
						{LETTERS.map((letter, i) => (
							<motion.span
								// biome-ignore lint/suspicious/noArrayIndexKey: static list with duplicate chars needs index for unique keys
								key={`${letter.char}-${i}`}
								variants={letterVariants}
								custom={letter.delay}
								className={letter.color}
							>
								{letter.char}
							</motion.span>
						))}
					</span>
				</motion.div>
				{showSubtitle && (
					<motion.div
						variants={subtitleWrapVariants}
						className="overflow-hidden"
					>
						<motion.span
							variants={subtitleVariants}
							className={cn(
								"block select-none font-medium font-subtitle text-primary uppercase tracking-[0.28em]",
								subtitle,
								subtitleClassName,
							)}
						>
							{company.brand.subtitle}
						</motion.span>
					</motion.div>
				)}
			</div>
		</motion.div>
	);
}

function LogoIcon({ size = 40 }: { size?: number }) {
	const aspectRatio = 307 / 267;
	const width = Math.round(size * aspectRatio);

	return (
		<svg
			width={width}
			height={size}
			viewBox="0 0 307 267"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M239.5 45.5029V43.5029H306V45.5029C293.504 46.7908 289.588 51.2407 289.5 67.5029V239.503C289.354 254.116 293.662 258.412 306.5 261.503V263.503H238.5V261.503C254.597 257.338 255.49 251.529 255.5 239.503V67.5029C255.733 55.9914 253.468 46.6207 239.5 45.5029Z"
				className="fill-primary stroke-primary"
			/>
			<path
				d="M255 150.503V143.503C201.423 139.174 151.984 134.469 109 141.003C52.9999 152.003 -0.111481 193.607 0.999803 232.503C1.58526 252.995 20.9998 266.638 52.9998 265.503C123.5 263.003 185.5 213.503 205 161.003C189.416 162.818 178.276 162.661 161.5 161.003C169 193.003 115.5 254.003 66.4997 252.503C43.9998 252.503 36.1271 237.216 36.9997 224.503C38.4998 189.003 76.0731 157.547 141.5 150.503C176.758 147.776 210.312 150.104 255 150.503Z"
				className="fill-primary stroke-primary"
			/>
			<path
				d="M205.5 128.003C211.094 47.1978 164.02 0.562145 86 1.00293L0.5 0.502934V2.50298C13.9499 3.33558 22.5248 7.36422 22 40.503V170.003C34.2902 156.346 43.0117 151.175 56.5 146.503V10.0029C56.5 10.0029 90 9.50293 97 10.0029C149 14.5029 172.5 63.0029 163 128.003C181.153 125.505 187.242 125.277 205.5 128.003Z"
				className="fill-highlight stroke-highlight"
			/>
			<circle
				cx="113.5"
				cy="99.5029"
				r="14.5"
				className="fill-highlight stroke-highlight"
			/>
		</svg>
	);
}
