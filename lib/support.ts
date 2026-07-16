/** Single place for the support/contact address shown on legal pages.
 *  Override at build time with NEXT_PUBLIC_SUPPORT_EMAIL; make sure the
 *  default alias actually receives mail before launch. */
export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@carecompass.me";
