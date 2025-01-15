"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import { Extension } from "@tiptap/core";
import { Button } from "./ui/button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading1,
  Heading2,
  Heading3,
  Type,
} from "lucide-react";

// Custom extension to handle text sizes
const CustomTextStyle = Extension.create({
  name: "customTextStyle",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
});

interface EditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
  showHeadings?: boolean;
  showParagraphStyle?: boolean;
}

export default function Editor({
  content,
  onChange,
  editable = true,
  showHeadings = true,
  showParagraphStyle = true,
}: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: showHeadings ? {
          levels: [1, 2, 3],
        } : false,
        bulletList: {
          HTMLAttributes: {
            class: "list-disc list-inside",
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: "list-decimal list-inside",
          },
        },
        listItem: {
          HTMLAttributes: {
            class: "marker:text-current",
          },
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
      }),
      TextStyle,
      CustomTextStyle,
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: [
          "prose",
          "prose-sm",
          "focus:outline-none",
          "max-w-full",
          "min-h-[150px]",
          "[&>ul>li>*]:inline",
          "[&>ol>li>*]:inline",
          "[&>blockquote]:relative",
          "[&>blockquote]:pl-6",
          "[&>blockquote]:pr-4",
          "[&>blockquote]:my-4",
          "[&>blockquote]:border-l-4",
          "[&>blockquote]:border-gray-300",
          "[&>blockquote]:not-italic",
          "[&>blockquote>p]:relative",
          "[&>blockquote>p]:m-0",
          "[&>blockquote>p]:leading-[1.6]",
          "[&>blockquote>p]:text-inherit",
          `[&>blockquote>p]:before:content-['\u201C']`,
          "[&>blockquote>p]:before:absolute",
          "[&>blockquote>p]:before:-left-4",
          "[&>blockquote>p]:before:font-inherit",
          "[&>blockquote>p]:before:text-inherit",
          "[&>blockquote>p]:before:leading-[1]",
          `[&>blockquote>p]:after:content-['\u201D']`,
          "[&>blockquote>p]:after:relative",
          "[&>blockquote>p]:after:ml-1",
          "[&>blockquote>p]:after:font-inherit",
          "[&>blockquote>p]:after:text-inherit",
          "[&>blockquote>p]:after:leading-[1]"
        ].join(" "),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  const setTextSize = (size: string | null) => {
    editor.chain().focus().setMark("textStyle", { fontSize: size }).run();
  };

  return (
    <div className="space-y-4">
      {editable && (
        <div className="flex items-center space-x-2 border-b pb-2">
          <div className="flex items-center space-x-2 pr-4 border-r">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive("bold") ? "bg-gray-200" : ""}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive("italic") ? "bg-gray-200" : ""}
            >
              <Italic className="h-4 w-4" />
            </Button>
          </div>

          {(showParagraphStyle || showHeadings) && (
            <div className="flex items-center space-x-2 pr-4 border-r">
              {showParagraphStyle && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().setParagraph().run()}
                  className={editor.isActive("paragraph") ? "bg-gray-200" : ""}
                >
                  <Type className="h-4 w-4" />
                </Button>
              )}
              {showHeadings && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const isInList = editor.isActive("listItem");
                      if (isInList) {
                        const hasCustomSize = editor.isActive("textStyle", { fontSize: "2.25rem" });
                        setTextSize(hasCustomSize ? null : "2.25rem"); // Toggle between large and default size
                      } else {
                        editor.chain().focus().toggleHeading({ level: 1 }).run();
                      }
                    }}
                    className={
                      editor.isActive("heading", { level: 1 }) ? "bg-gray-200" : ""
                    }
                  >
                    <Heading1 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const isInList = editor.isActive("listItem");
                      if (isInList) {
                        const hasCustomSize = editor.isActive("textStyle", { fontSize: "1.875rem" });
                        setTextSize(hasCustomSize ? null : "1.875rem"); // Toggle between medium and default size
                      } else {
                        editor.chain().focus().toggleHeading({ level: 2 }).run();
                      }
                    }}
                    className={
                      editor.isActive("heading", { level: 2 }) ? "bg-gray-200" : ""
                    }
                  >
                    <Heading2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const isInList = editor.isActive("listItem");
                      if (isInList) {
                        const hasCustomSize = editor.isActive("textStyle", { fontSize: "1.5rem" });
                        setTextSize(hasCustomSize ? null : "1.5rem"); // Toggle between small and default size
                      } else {
                        editor.chain().focus().toggleHeading({ level: 3 }).run();
                      }
                    }}
                    className={
                      editor.isActive("heading", { level: 3 }) ? "bg-gray-200" : ""
                    }
                  >
                    <Heading3 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2 pr-4 border-r">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={editor.isActive("bulletList") ? "bg-gray-200" : ""}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={editor.isActive("orderedList") ? "bg-gray-200" : ""}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={editor.isActive("blockquote") ? "bg-gray-200" : ""}
            >
              <Quote className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              className={
                editor.isActive({ textAlign: "left" }) ? "bg-gray-200" : ""
              }
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              className={
                editor.isActive({ textAlign: "center" }) ? "bg-gray-200" : ""
              }
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              className={
                editor.isActive({ textAlign: "right" }) ? "bg-gray-200" : ""
              }
            >
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                editor.chain().focus().setTextAlign("justify").run()
              }
              className={
                editor.isActive({ textAlign: "justify" }) ? "bg-gray-200" : ""
              }
            >
              <AlignJustify className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div
        className={`min-h-[200px] w-full rounded-lg border border-input bg-background p-3 ${
          !editable && "border-none p-0"
        }`}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
