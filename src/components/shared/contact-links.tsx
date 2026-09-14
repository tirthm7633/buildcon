"use client";

import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

import { logContact } from "@/lib/actions/activity";
import { toIndianCountryCodeDigits } from "@/lib/phone";
import type { FloorId } from "@/lib/supabase/types";

function whatsappHref(phone: string) {
  return `https://wa.me/${toIndianCountryCodeDigits(phone)}`;
}

interface ContactLinkOwnProps {
  entityType: "walk_in" | "customer";
  entityId: string;
  floorId: FloorId;
  /** Stop the click from also triggering a parent element's own handler
   * (e.g. a card that navigates to the detail page on click). */
  stopPropagation?: boolean;
}

type CallLinkProps = ContactLinkOwnProps & Omit<ComponentPropsWithoutRef<"a">, "href"> & { phone: string };

/** tel: link that also logs a "called them" timeline entry the moment the
 * dialer opens — the best signal a browser can give that contact was
 * initiated; there's no way to confirm the call was actually answered.
 * forwardRef so it works as a shadcn Button `asChild` target. */
export const CallLink = forwardRef<HTMLAnchorElement, CallLinkProps>(function CallLink(
  { entityType, entityId, floorId, phone, stopPropagation, onClick, ...props },
  ref
) {
  return (
    <a
      ref={ref}
      href={`tel:+${toIndianCountryCodeDigits(phone)}`}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        void logContact(entityType, entityId, floorId, "call");
        onClick?.(e);
      }}
      {...props}
    />
  );
});

type WhatsAppLinkProps = ContactLinkOwnProps & Omit<ComponentPropsWithoutRef<"a">, "href"> & { phone: string };

/** wa.me link that logs a "messaged them on WhatsApp" timeline entry. */
export const WhatsAppLink = forwardRef<HTMLAnchorElement, WhatsAppLinkProps>(function WhatsAppLink(
  { entityType, entityId, floorId, phone, stopPropagation, onClick, ...props },
  ref
) {
  return (
    <a
      ref={ref}
      href={whatsappHref(phone)}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        void logContact(entityType, entityId, floorId, "whatsapp");
        onClick?.(e);
      }}
      {...props}
    />
  );
});
