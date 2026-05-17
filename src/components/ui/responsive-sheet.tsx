"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { useIsDesktop } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

type Size = "md" | "lg" | "xl" | "2xl";

const SIZE_CLASS: Record<Size, string> = {
	md: "sm:max-w-md",
	lg: "sm:max-w-lg",
	xl: "sm:max-w-xl",
	"2xl": "sm:max-w-2xl",
};

type ResponsiveSheetContextValue = { isDesktop: boolean };

const ResponsiveSheetContext =
	createContext<ResponsiveSheetContextValue | null>(null);

function useResponsiveSheetContext(): ResponsiveSheetContextValue {
	const value = useContext(ResponsiveSheetContext);
	if (!value) {
		throw new Error("ResponsiveSheet.* must be used inside <ResponsiveSheet>");
	}
	return value;
}

type RootProps = {
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	children: ReactNode;
};

function ResponsiveSheet({
	open,
	defaultOpen,
	onOpenChange,
	children,
}: RootProps) {
	const isDesktop = useIsDesktop();
	const ctx = useMemo<ResponsiveSheetContextValue>(
		() => ({ isDesktop }),
		[isDesktop],
	);
	const Root = isDesktop ? Sheet : Drawer;

	return (
		<ResponsiveSheetContext.Provider value={ctx}>
			<Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
				{children}
			</Root>
		</ResponsiveSheetContext.Provider>
	);
}

type TriggerProps = React.ComponentProps<typeof SheetTrigger>;

function ResponsiveSheetTrigger(props: TriggerProps) {
	const { isDesktop } = useResponsiveSheetContext();
	return isDesktop ? <SheetTrigger {...props} /> : <DrawerTrigger {...props} />;
}

type CloseProps = React.ComponentProps<typeof SheetClose>;

function ResponsiveSheetClose(props: CloseProps) {
	const { isDesktop } = useResponsiveSheetContext();
	return isDesktop ? <SheetClose {...props} /> : <DrawerClose {...props} />;
}

type ContentProps = Omit<
	React.ComponentProps<typeof SheetContent>,
	"side" | "showCloseButton"
> & {
	size?: Size;
};

function ResponsiveSheetContent({
	className,
	size = "xl",
	children,
	...props
}: ContentProps) {
	const { isDesktop } = useResponsiveSheetContext();

	if (isDesktop) {
		return (
			<SheetContent
				side="right"
				className={cn(
					"flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-none",
					SIZE_CLASS[size],
					className,
				)}
				{...props}
			>
				{children}
			</SheetContent>
		);
	}

	return (
		<DrawerContent
			className={cn(
				"flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 outline-none",
				className,
			)}
		>
			{children}
		</DrawerContent>
	);
}

function ResponsiveSheetHeader({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="responsive-sheet-header"
			className={cn(
				"flex flex-col gap-1 border-b px-4 py-3 text-left sm:px-6",
				className,
			)}
			{...props}
		/>
	);
}

function ResponsiveSheetBody({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="responsive-sheet-body"
			className={cn(
				"min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6",
				className,
			)}
			{...props}
		/>
	);
}

function ResponsiveSheetFooter({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="responsive-sheet-footer"
			className={cn(
				"flex flex-col-reverse gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-6",
				className,
			)}
			{...props}
		/>
	);
}

function ResponsiveSheetTitle(props: React.ComponentProps<typeof SheetTitle>) {
	const { isDesktop } = useResponsiveSheetContext();
	return isDesktop ? <SheetTitle {...props} /> : <DrawerTitle {...props} />;
}

function ResponsiveSheetDescription(
	props: React.ComponentProps<typeof SheetDescription>,
) {
	const { isDesktop } = useResponsiveSheetContext();
	return isDesktop ? (
		<SheetDescription {...props} />
	) : (
		<DrawerDescription {...props} />
	);
}

export {
	ResponsiveSheet,
	ResponsiveSheetBody,
	ResponsiveSheetClose,
	ResponsiveSheetContent,
	ResponsiveSheetDescription,
	ResponsiveSheetFooter,
	ResponsiveSheetHeader,
	ResponsiveSheetTitle,
	ResponsiveSheetTrigger,
};
