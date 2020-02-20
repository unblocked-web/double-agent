Tests:
Set a cookie via header
Set a cookie via document.cookie on the page
Set a cookie to expire and make sure it doesn't get sent back

Secure Cookie:
Test setting secure cookie from https
Send to secure link
Send to insecure link

SameSite:
- Controls top level navigation (include when directly navigating if Lax/None, not with Strict)
-

Same Site None (run also with no same site header)
Set a cookie from headers.ulixee.org with SameSite=None
Test sent to a1.ulixee.org on http
Test sent to a1.ulixee.org on https
Tests setting with Secure (should be rejected without this)
Test sent to headers.dataliberationfoundation.org (http + https)

Same Site Lax
Set a cookie from headers.ulixee.org with SameSite=Lax
Test sent to a1.ulixee.org on http
Test sent to a1.ulixee.org on https
Tests setting with Secure (should be rejected without this)
Test sent to headers.dataliberationfoundation.org (http + https)

HttpOnly cookies - should not be accessible in the browser (document.cookie - shows domain cookies)
