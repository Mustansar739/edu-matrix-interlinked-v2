"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

/**
 * DialogContent component - Requires DialogTitle for accessibility compliance
 * 
 * This component ensures proper accessibility by requiring either:
 * 1. A DialogTitle child component, or
 * 2. Explicit aria-labelledby attribute
 * 
 * @param className - Additional CSS classes
 * @param children - Child components (must include DialogTitle)
 * @param showCloseButton - Whether to show the close button (default: true)
 * @param props - Additional props passed to the DialogPrimitive.Content
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  const titleId = React.useId()

  // Check for DialogTitle or aria attributes
  const hasAriaLabel = props['aria-labelledby'] || props['aria-label']
  const hasExplicitTitle = React.Children.toArray(children).some((child) => {
    if (React.isValidElement(child)) {
      // Check for direct DialogTitle
      if (child.type === DialogTitle) return true
      
      // Check for DialogHeader containing DialogTitle
      if (child.type === DialogHeader && child.props && typeof child.props === 'object' && 'children' in child.props) {
        return React.Children.toArray(child.props.children as React.ReactNode).some(
          (grandChild) => React.isValidElement(grandChild) && grandChild.type === DialogTitle
        )
      }
      
      // Check for nested DialogTitle in other components
      if (child.props && typeof child.props === 'object' && 'children' in child.props) {
        const hasNestedTitle = (element: React.ReactNode): boolean => {
          if (React.isValidElement(element)) {
            if (element.type === DialogTitle) return true
            if (element.props && typeof element.props === 'object' && 'children' in element.props) {
              return React.Children.toArray(element.props.children as React.ReactNode).some(hasNestedTitle)
            }
          }
          return false
        }
        return React.Children.toArray(child.props.children as React.ReactNode).some(hasNestedTitle)
      }
    }
    return false
  })

  // If no explicit title or aria attributes, add a visually hidden title
  const shouldAddHiddenTitle = !hasExplicitTitle && !hasAriaLabel

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        )}
        aria-labelledby={hasAriaLabel ? props['aria-labelledby'] : (shouldAddHiddenTitle ? titleId : undefined)}
        {...props}
      >
        {shouldAddHiddenTitle && (
          <DialogPrimitive.Title id={titleId} className="sr-only">
            Dialog
          </DialogPrimitive.Title>
        )}
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

/**
 * VisuallyHidden component for accessibility
 * Use this to hide DialogTitle visually while keeping it accessible to screen readers
 */
function VisuallyHidden({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("sr-only", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  VisuallyHidden,
}
