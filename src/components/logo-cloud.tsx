import { InfiniteSlider } from "@/components/infinite-slider";
import { cn } from "@/lib/utils";

type Logo = {
	src: string;
	alt: string;
	width?: number;
	height?: number;
};

type LogoCloudProps = React.ComponentProps<"div"> & {
	logos: Logo[];
};

export function LogoCloud({ className, logos, ...props }: LogoCloudProps) {
	return (
		<div
			{...props}
			className={cn(
				"mask-[linear-gradient(to_right,transparent,black,transparent)] overflow-hidden py-4",
				className,
			)}
		>
			<InfiniteSlider gap={42} reverse duration={80} durationOnHover={25}>
				{logos.map((logo) => (
					// biome-ignore lint/performance/noImgElement: external SVG logos in animated slider
					<img
						alt={logo.alt}
						className="pointer-events-none h-4 select-none brightness-0 md:h-5 dark:invert"
						height={logo.height || "auto"}
						key={`logo-${logo.alt}`}
						loading="lazy"
						src={logo.src}
						width={logo.width || "auto"}
					/>
				))}
			</InfiniteSlider>
		</div>
	);
}
