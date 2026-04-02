import {
	AlertTriangleIcon,
	CalendarIcon,
	GiftIcon,
	InfoIcon,
	LandmarkIcon,
	MegaphoneIcon,
	StarIcon,
	TagIcon,
} from "lucide-react";
import type { ReactNode } from "react";

const iconMap: Record<string, ReactNode> = {
	landmark: <LandmarkIcon />,
	calendar: <CalendarIcon />,
	megaphone: <MegaphoneIcon />,
	gift: <GiftIcon />,
	"alert-triangle": <AlertTriangleIcon />,
	info: <InfoIcon />,
	star: <StarIcon />,
	tag: <TagIcon />,
};

export function getBannerIcon(name?: string): ReactNode | undefined {
	if (!name) return undefined;
	return iconMap[name];
}
