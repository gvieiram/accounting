-- CreateEnum
CREATE TYPE "ProposalTemplateKey" AS ENUM ('DESENQUADRAMENTO', 'REESTRUTURACAO', 'ABERTURA', 'TRANSFERENCIA', 'ENTREGA_ANUAL_MEI', 'ANALISE_CONTABIL');

-- CreateEnum
CREATE TYPE "ProposalTemplateCategory" AS ENUM ('CONTINUOUS', 'ONE_OFF');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SENT', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PROPOSAL_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PROPOSAL_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'PROPOSAL_MARKED_SENT';
ALTER TYPE "AuditAction" ADD VALUE 'PROPOSAL_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE 'PROPOSAL_DECLINED';
ALTER TYPE "AuditAction" ADD VALUE 'PROPOSAL_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'PROPOSAL_TOKEN_ROTATED';
ALTER TYPE "AuditAction" ADD VALUE 'PROPOSAL_TEMPLATE_UPDATED';

-- CreateTable
CREATE TABLE "ProposalTemplate" (
    "id" TEXT NOT NULL,
    "key" "ProposalTemplateKey" NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ProposalTemplateCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposalTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalTemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fieldsSchema" JSONB NOT NULL,
    "defaultContent" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "clientId" TEXT,
    "prospectData" JSONB,
    "editableContent" JSONB NOT NULL DEFAULT '{}',
    "mainAmount" DECIMAL(12,2),
    "recurringAmount" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "commercialData" JSONB NOT NULL DEFAULT '{}',
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "expiresAt" TIMESTAMP(3),
    "publicTokenHash" TEXT,
    "firstViewedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalPublishedVersion" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "templateKey" "ProposalTemplateKey" NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "renderedHtml" TEXT NOT NULL,
    "publishedById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalPublishedVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProposalTemplate_key_key" ON "ProposalTemplate"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalTemplate_currentVersionId_key" ON "ProposalTemplate"("currentVersionId");

-- CreateIndex
CREATE INDEX "ProposalTemplateVersion_templateId_idx" ON "ProposalTemplateVersion"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalTemplateVersion_templateId_version_key" ON "ProposalTemplateVersion"("templateId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_publicTokenHash_key" ON "Proposal"("publicTokenHash");

-- CreateIndex
CREATE INDEX "Proposal_status_createdAt_idx" ON "Proposal"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Proposal_clientId_idx" ON "Proposal"("clientId");

-- CreateIndex
CREATE INDEX "Proposal_status_expiresAt_idx" ON "Proposal"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "ProposalPublishedVersion_proposalId_idx" ON "ProposalPublishedVersion"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalPublishedVersion_proposalId_version_key" ON "ProposalPublishedVersion"("proposalId", "version");

-- AddForeignKey
ALTER TABLE "ProposalTemplate" ADD CONSTRAINT "ProposalTemplate_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "ProposalTemplateVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalTemplateVersion" ADD CONSTRAINT "ProposalTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProposalTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalTemplateVersion" ADD CONSTRAINT "ProposalTemplateVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProposalTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "ProposalTemplateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalPublishedVersion" ADD CONSTRAINT "ProposalPublishedVersion_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalPublishedVersion" ADD CONSTRAINT "ProposalPublishedVersion_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
