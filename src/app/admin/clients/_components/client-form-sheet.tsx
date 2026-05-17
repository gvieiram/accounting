"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm, useFormContext } from "react-hook-form";
import { toast } from "sonner";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	ResponsiveSheet,
	ResponsiveSheetBody,
	ResponsiveSheetContent,
	ResponsiveSheetDescription,
	ResponsiveSheetFooter,
	ResponsiveSheetHeader,
	ResponsiveSheetTitle,
} from "@/components/ui/responsive-sheet";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	createClientAction,
	updateClientAction,
} from "@/features/clients/actions";
import {
	CLIENT_STATUSES,
	CLIENT_TYPES,
	TAX_REGIMES,
} from "@/features/clients/constants";
import {
	CLIENT_FORM_TAB_ORDER,
	type ClientFormTabId,
	computeErrorsByTab,
	countFormErrors,
	firstTabWithError,
} from "@/features/clients/form-tabs";
import { clientSchema } from "@/features/clients/schemas";
import type {
	ClientFormInput,
	ParentClientCandidate,
} from "@/features/clients/types";
import { formatPhoneBR, stripDocument } from "@/features/clients/utils";
import {
	ClientStatus,
	ClientType,
	type TaxRegime,
} from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { useMessages } from "@/stores/use-content-store";
import { AdditionalContactsField } from "./additional-contacts-field";
import { AddressFields } from "./address-fields";
import { DocumentInput } from "./document-input";
import { ParentClientCombobox } from "./parent-client-combobox";

const NO_TAX_REGIME_VALUE = "__none";
const FORM_ID = "client-form";

const defaultValues: ClientFormInput = {
	type: ClientType.PJ,
	legalName: "",
	tradeName: undefined,
	document: "",
	taxRegime: null,
	stateRegistration: undefined,
	cityRegistration: undefined,
	segment: undefined,
	primaryEmail: "",
	primaryPhone: "",
	contactName: "",
	zipCode: undefined,
	street: undefined,
	number: undefined,
	complement: undefined,
	neighborhood: undefined,
	city: undefined,
	state: undefined,
	additionalContacts: [],
	parentClientId: null,
	parentDocument: undefined,
	status: ClientStatus.ACTIVE,
	internalNotes: undefined,
};

export type ClientFormSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "edit";
	clientId?: string;
	displayName?: string;
	initialValues?: ClientFormInput;
	initialParent?: ParentClientCandidate | null;
	onSuccess?: () => void;
};

export function ClientFormSheet({
	open,
	onOpenChange,
	mode,
	clientId,
	displayName,
	initialValues,
	initialParent,
	onSuccess,
}: ClientFormSheetProps) {
	const messages = useMessages();
	const [isPending, startTransition] = useTransition();
	const [activeTab, setActiveTab] = useState<ClientFormTabId>("identification");
	const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
	const tabsContainerRef = useRef<HTMLDivElement>(null);

	const form = useForm<ClientFormInput>({
		resolver: zodResolver(clientSchema),
		defaultValues: initialValues ?? defaultValues,
		mode: "onBlur",
	});
	const type = form.watch("type");

	// When the sheet opens, reset the form to the right snapshot and jump back
	// to the first tab. Without this, reopening an edit sheet after a partial
	// edit-then-discard would keep stale values from the previous session.
	useEffect(() => {
		if (open) {
			form.reset(initialValues ?? defaultValues);
			setActiveTab("identification");
		}
	}, [open, initialValues, form]);

	// Keep the active tab visible inside the horizontally-scrollable TabsList.
	// The DOM query reads the `data-state="active"` attribute Radix sets, so
	// `activeTab` is referenced explicitly to ensure the effect re-runs on
	// tab change (the lookup itself doesn't depend on the value).
	useEffect(() => {
		if (!open) return;
		void activeTab;
		const trigger = tabsContainerRef.current?.querySelector<HTMLElement>(
			'[data-slot="tabs-trigger"][data-state="active"]',
		);
		trigger?.scrollIntoView({
			inline: "nearest",
			block: "nearest",
			behavior: "smooth",
		});
	}, [open, activeTab]);

	const tabLabels = messages.admin.clients.form.tabs;
	const sheetLabels = messages.admin.clients.form.sheet;
	const submitLabels = messages.admin.clients.form.submit;
	const isEditing = mode === "edit";
	const isPj = type === ClientType.PJ;

	const visibleTabs = useMemo(() => {
		return CLIENT_FORM_TAB_ORDER.filter((id) => {
			if (id === "hierarchy" && !isPj) return false;
			return true;
		});
	}, [isPj]);

	const errorsByTab = useMemo(
		() => computeErrorsByTab(form.formState.errors),
		[form.formState.errors],
	);

	const errorCount = useMemo(
		() => countFormErrors(form.formState.errors),
		[form.formState.errors],
	);

	const firstErrorTab = firstTabWithError(form.formState.errors, visibleTabs);

	function submit(values: ClientFormInput) {
		startTransition(async () => {
			const result =
				clientId !== undefined
					? await updateClientAction(clientId, values)
					: await createClientAction(values);

			if (!result.success) {
				toast.error(result.error);
				return;
			}

			toast.success(
				isEditing ? submitLabels.successUpdate : submitLabels.successCreate,
			);
			form.reset(values);
			onSuccess?.();
			onOpenChange(false);
		});
	}

	function handleInvalid(errors: Parameters<typeof firstTabWithError>[0]) {
		const targetTab = firstTabWithError(errors) ?? "identification";
		setActiveTab(targetTab);
	}

	function requestClose() {
		if (form.formState.isDirty && !isPending) {
			setDismissDialogOpen(true);
			return;
		}
		onOpenChange(false);
	}

	function confirmDismiss() {
		setDismissDialogOpen(false);
		form.reset(initialValues ?? defaultValues);
		onOpenChange(false);
	}

	return (
		<>
			<ResponsiveSheet
				open={open}
				onOpenChange={(next) => {
					if (next) {
						onOpenChange(true);
						return;
					}
					requestClose();
				}}
			>
				<ResponsiveSheetContent size="xl">
					<ResponsiveSheetHeader>
						<ResponsiveSheetTitle>
							{isEditing ? sheetLabels.titleEdit : sheetLabels.titleCreate}
						</ResponsiveSheetTitle>
						<ResponsiveSheetDescription>
							{isEditing && displayName
								? sheetLabels.descriptionEdit(displayName)
								: sheetLabels.descriptionCreate}
						</ResponsiveSheetDescription>
					</ResponsiveSheetHeader>

					<ResponsiveSheetBody>
						<Form {...form}>
							<form
								id={FORM_ID}
								className="grid min-w-0 gap-6"
								onSubmit={form.handleSubmit(submit, handleInvalid)}
								noValidate
							>
								<Tabs
									value={activeTab}
									onValueChange={(value) =>
										setActiveTab(value as ClientFormTabId)
									}
									className="min-w-0 gap-6"
									ref={tabsContainerRef}
								>
									<TabsList>
										{visibleTabs.map((id) => (
											<TabsTrigger
												key={id}
												value={id}
												className="data-[state=active]:bg-background"
											>
												<span>{tabLabels[id]}</span>
												{errorsByTab[id] > 0 ? (
													<span
														aria-hidden="true"
														className="ml-1 inline-block size-1.5 rounded-full bg-destructive"
													/>
												) : null}
											</TabsTrigger>
										))}
									</TabsList>

									<TabsContent value="identification" className="grid gap-4">
										<IdentificationFields />
									</TabsContent>

									<TabsContent value="contact" className="grid gap-4">
										<ContactFields />
									</TabsContent>

									<TabsContent value="address" className="grid gap-4">
										<AddressFields />
									</TabsContent>

									{isPj ? (
										<TabsContent value="hierarchy" className="grid gap-4">
											<HierarchySection
												clientId={clientId}
												initialParent={initialParent}
											/>
										</TabsContent>
									) : null}

									<TabsContent value="extras" className="grid gap-4">
										<ExtrasFields isPj={isPj} />
									</TabsContent>
								</Tabs>
							</form>
						</Form>
					</ResponsiveSheetBody>

					<ResponsiveSheetFooter className="gap-3">
						<div
							aria-live="polite"
							className={cn(
								"flex-1 text-sm",
								errorCount > 0
									? "text-destructive"
									: "sr-only text-muted-foreground sm:not-sr-only",
							)}
						>
							{errorCount > 0 && firstErrorTab
								? messages.admin.clients.form.errorSummary(
										errorCount,
										tabLabels[firstErrorTab],
									)
								: null}
						</div>
						<Button
							type="button"
							variant="outline"
							onClick={requestClose}
							disabled={isPending}
						>
							{messages.common.actions.cancel}
						</Button>
						<Button form={FORM_ID} type="submit" disabled={isPending}>
							{isPending ? (
								<>
									<Loader2Icon
										aria-hidden="true"
										className="size-4 animate-spin"
									/>
									{submitLabels.saving}
								</>
							) : isEditing ? (
								submitLabels.update
							) : (
								submitLabels.create
							)}
						</Button>
					</ResponsiveSheetFooter>
				</ResponsiveSheetContent>
			</ResponsiveSheet>

			<AlertDialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{messages.admin.clients.form.dismissDialog.title}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{messages.admin.clients.form.dismissDialog.description}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>
							{messages.admin.clients.form.dismissDialog.cancel}
						</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDismiss}>
							{messages.admin.clients.form.dismissDialog.confirm}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

// ---------------------------------------------------------------------------
// Field groups
// ---------------------------------------------------------------------------

function IdentificationFields() {
	const messages = useMessages();
	const form = useFormContext<ClientFormInput>();
	const fields = messages.admin.clients.form.fields;
	const type = form.watch("type");

	return (
		<>
			<FormField
				control={form.control}
				name="type"
				render={({ field }) => (
					<FormItem>
						<FormLabel>{fields.type}</FormLabel>
						<FormControl>
							<RadioGroup
								value={field.value}
								onValueChange={field.onChange}
								className="grid grid-cols-2 gap-2"
							>
								{CLIENT_TYPES.map((option) => (
									<Label
										key={option}
										className="flex h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
									>
										<RadioGroupItem value={option} />
										{messages.admin.enums.clientType[option]}
									</Label>
								))}
							</RadioGroup>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			<DocumentInput type={type} />
			<TextInputField name="legalName" label={fields.legalName} />
			<TextInputField name="tradeName" label={fields.tradeName} />
			<FormField
				control={form.control}
				name="status"
				render={({ field }) => (
					<FormItem>
						<FormLabel>{fields.status}</FormLabel>
						<Select value={field.value} onValueChange={field.onChange}>
							<FormControl>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
							</FormControl>
							<SelectContent>
								{CLIENT_STATUSES.map((status) => (
									<SelectItem key={status} value={status}>
										{messages.admin.enums.clientStatus[status]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FormMessage />
					</FormItem>
				)}
			/>
		</>
	);
}

function ContactFields() {
	const messages = useMessages();
	const fields = messages.admin.clients.form.fields;
	const sections = messages.admin.clients.form.sections;

	return (
		<>
			<div className="grid gap-4 md:grid-cols-2">
				<TextInputField name="contactName" label={fields.contactName} />
				<TextInputField
					name="primaryEmail"
					label={fields.primaryEmail}
					type="email"
				/>
				<div className="md:col-span-2">
					<PhoneInputField name="primaryPhone" label={fields.primaryPhone} />
				</div>
			</div>
			<div className="grid gap-3 border-t pt-4">
				<h3 className="font-medium text-sm">{sections.additionalContacts}</h3>
				<AdditionalContactsField />
			</div>
		</>
	);
}

function ExtrasFields({ isPj }: { isPj: boolean }) {
	const messages = useMessages();
	const form = useFormContext<ClientFormInput>();
	const fields = messages.admin.clients.form.fields;

	return (
		<>
			{isPj ? (
				<div className="grid gap-4 md:grid-cols-2">
					<FormField
						control={form.control}
						name="taxRegime"
						render={({ field }) => (
							<FormItem className="md:col-span-2">
								<FormLabel>{fields.taxRegime}</FormLabel>
								<Select
									value={field.value ?? NO_TAX_REGIME_VALUE}
									onValueChange={(value) =>
										field.onChange(
											value === NO_TAX_REGIME_VALUE
												? null
												: (value as TaxRegime),
										)
									}
								>
									<FormControl>
										<SelectTrigger className="w-full">
											<SelectValue />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value={NO_TAX_REGIME_VALUE}>
											{messages.common.terms.notInformed}
										</SelectItem>
										{TAX_REGIMES.map((regime) => (
											<SelectItem key={regime} value={regime}>
												{messages.admin.enums.taxRegime[regime]}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
					<TextInputField
						name="stateRegistration"
						label={fields.stateRegistration}
					/>
					<TextInputField
						name="cityRegistration"
						label={fields.cityRegistration}
					/>
					<div className="md:col-span-2">
						<TextInputField name="segment" label={fields.segment} />
					</div>
				</div>
			) : null}
			<FormField
				control={form.control}
				name="internalNotes"
				render={({ field }) => (
					<FormItem>
						<FormLabel>{fields.notes}</FormLabel>
						<FormControl>
							<Textarea {...field} value={field.value ?? ""} rows={4} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		</>
	);
}

function HierarchySection({
	clientId,
	initialParent,
}: {
	clientId?: string;
	initialParent?: ParentClientCandidate | null;
}) {
	const messages = useMessages();

	return (
		<div className="grid gap-2">
			<p className="text-muted-foreground text-sm">
				{messages.admin.clients.form.hints.cnpjRootMustMatch}
			</p>
			<ParentClientCombobox
				excludeId={clientId}
				initialParent={initialParent}
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Reusable inputs
// ---------------------------------------------------------------------------

type TextInputName =
	| "legalName"
	| "tradeName"
	| "stateRegistration"
	| "cityRegistration"
	| "segment"
	| "contactName"
	| "primaryEmail";

function TextInputField({
	name,
	label,
	type = "text",
}: {
	name: TextInputName;
	label: string;
	type?: string;
}) {
	const form = useFormContext<ClientFormInput>();

	return (
		<FormField
			control={form.control}
			name={name}
			render={({ field }) => (
				<FormItem>
					<FormLabel>{label}</FormLabel>
					<FormControl>
						<Input {...field} value={field.value ?? ""} type={type} />
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}

function PhoneInputField({
	name,
	label,
}: {
	name: "primaryPhone";
	label: string;
}) {
	const form = useFormContext<ClientFormInput>();

	return (
		<FormField
			control={form.control}
			name={name}
			render={({ field }) => (
				<FormItem>
					<FormLabel>{label}</FormLabel>
					<FormControl>
						<Input
							{...field}
							value={formatPhoneBR(field.value ?? "")}
							inputMode="numeric"
							onChange={(event) =>
								field.onChange(stripDocument(event.target.value).slice(0, 11))
							}
						/>
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}
