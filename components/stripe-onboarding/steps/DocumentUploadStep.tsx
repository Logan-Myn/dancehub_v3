"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Upload, File, CheckCircle, X, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

interface DocumentInfo {
  type: string;
  purpose: string;
  file: File;
  uploaded?: boolean;
  url?: string;
}

interface DocumentUploadStepProps {
  data: {
    documents: DocumentInfo[];
    accountId?: string;
  };
  updateData: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLoading: boolean;
}

const DOCUMENT_TYPES = [
  {
    type: "identity_document",
    purpose: "identity_document",
    title: "Government-issued ID",
    description: "Driver's license, passport, or state ID",
    required: true,
    acceptedFormats: [".jpg", ".jpeg", ".png", ".pdf"],
    maxSize: "10MB",
  },
];

const ACCEPTED_FORMATS = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function DocumentUploadStep({
  data,
  updateData,
  onNext,
  onPrevious,
  isLoading,
}: DocumentUploadStepProps) {
  const [documents, setDocuments] = useState<DocumentInfo[]>(data.documents || []);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);
  const { session } = useAuth();

  useEffect(() => {
    const hasChanges = JSON.stringify(documents) !== JSON.stringify(data.documents || []);
    if (hasChanges) {
      updateData({ documents });
    }
  }, [documents]);

  const validateFile = (file: File) => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      throw new Error("Please upload a JPG, PNG, or PDF file");
    }
    
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("File size must be less than 10MB");
    }
  };

  const uploadDocument = async (file: File, type: string, purpose: string) => {
    if (!data.accountId) {
      throw new Error("Account ID is missing");
    }

    if (!session) {
      throw new Error("Not authenticated");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", type);
    formData.append("purpose", purpose);

    const response = await fetch(`/api/stripe/custom-account/${data.accountId}/upload-document`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to upload document");
    }

    return response.json();
  };

  const handleFileSelect = async (files: FileList | null, docType: typeof DOCUMENT_TYPES[0]) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const uploadKey = `${docType.type}_${docType.purpose}`;

    try {
      validateFile(file);

      setUploading(prev => ({ ...prev, [uploadKey]: true }));

      // Upload to Stripe
      const result = await uploadDocument(file, docType.type, docType.purpose);

      // Update local state
      const newDocument: DocumentInfo = {
        type: docType.type,
        purpose: docType.purpose,
        file: file,
        uploaded: true,
        url: result.url,
      };

      setDocuments(prev => {
        const filtered = prev.filter(doc => !(doc.type === docType.type && doc.purpose === docType.purpose));
        return [...filtered, newDocument];
      });

      toast.success(`${docType.title} uploaded successfully!`);
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload document");
    } finally {
      setUploading(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, docType: typeof DOCUMENT_TYPES[0]) => {
    e.preventDefault();
    setDragOver(null);
    handleFileSelect(e.dataTransfer.files, docType);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>, docType: typeof DOCUMENT_TYPES[0]) => {
    e.preventDefault();
    setDragOver(`${docType.type}_${docType.purpose}`);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(null);
  }, []);

  const removeDocument = (docType: typeof DOCUMENT_TYPES[0]) => {
    setDocuments(prev => prev.filter(doc => !(doc.type === docType.type && doc.purpose === docType.purpose)));
    toast.success("Document removed");
  };

  const getUploadedDocument = (docType: typeof DOCUMENT_TYPES[0]) => {
    return documents.find(doc => doc.type === docType.type && doc.purpose === docType.purpose);
  };

  const isDocumentUploaded = (docType: typeof DOCUMENT_TYPES[0]) => {
    return getUploadedDocument(docType)?.uploaded || false;
  };

  const canProceed = () => {
    const requiredDocs = DOCUMENT_TYPES.filter(doc => doc.required);
    return requiredDocs.every(doc => isDocumentUploaded(doc));
  };

  const handleSubmit = () => {
    if (!canProceed()) {
      toast.error("Please upload all required documents");
      return;
    }

    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Document Upload</h2>
        <p className="text-gray-600">
          Upload documents to verify your identity. All documents are encrypted and securely stored.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Document Guidelines</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700">
              <li>Documents must be clear, legible, and in color</li>
              <li>Ensure all corners and edges are visible</li>
              <li>Maximum file size: 10MB</li>
              <li>Supported formats: JPG, PNG, PDF</li>
              <li>Documents must be current and not expired</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {DOCUMENT_TYPES.map((docType) => {
          const uploadKey = `${docType.type}_${docType.purpose}`;
          const isUploading = uploading[uploadKey];
          const uploadedDoc = getUploadedDocument(docType);
          const isUploaded = isDocumentUploaded(docType);
          const isDraggedOver = dragOver === uploadKey;

          return (
            <Card key={uploadKey} className="relative">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <File className="h-5 w-5" />
                    <span>{docType.title}</span>
                    {docType.required && <span className="text-red-500">*</span>}
                  </div>
                  {isUploaded && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">Uploaded</span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{docType.description}</p>

                {!isUploaded ? (
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDraggedOver
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                    onDrop={(e) => handleDrop(e, docType)}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, docType)}
                    onDragLeave={handleDragLeave}
                  >
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-gray-900">
                        {isDraggedOver ? "Drop your file here" : "Drag and drop your file here"}
                      </p>
                      <p className="text-sm text-gray-500">or</p>
                      <label htmlFor={`file-${uploadKey}`}>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isUploading}
                          className="cursor-pointer"
                          onClick={() => document.getElementById(`file-${uploadKey}`)?.click()}
                        >
                          {isUploading ? "Uploading..." : "Choose File"}
                        </Button>
                      </label>
                      <input
                        id={`file-${uploadKey}`}
                        type="file"
                        className="hidden"
                        accept={docType.acceptedFormats.join(",")}
                        onChange={(e) => handleFileSelect(e.target.files, docType)}
                        disabled={isUploading}
                      />
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                      <p>Accepted formats: {docType.acceptedFormats.join(", ")}</p>
                      <p>Maximum size: {docType.maxSize}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <File className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-green-900">
                            {uploadedDoc?.file.name}
                          </p>
                          <p className="text-sm text-green-700">
                            {uploadedDoc?.file.size && (uploadedDoc.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(docType)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Progress Summary */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Upload Progress</p>
              <p className="text-sm text-gray-600">
                {documents.filter(doc => doc.uploaded).length} of {DOCUMENT_TYPES.filter(doc => doc.required).length} required documents uploaded
              </p>
            </div>
            <div className="text-right">
              {canProceed() ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Ready to continue</span>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Upload all required documents to continue
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!canProceed() || isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? "Processing..." : "Continue"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 