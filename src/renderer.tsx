import { reactRenderer } from "@hono/react-renderer";
import {
  Link,
  ReactRefresh,
  Script,
  ViteClient,
} from "vite-ssr-components/react";

export const renderer = reactRenderer(
  ({ children }) => {
    return (
      <html>
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <ViteClient />
          <ReactRefresh />
          <Script src="/src/client/index.tsx" />
          <Link href="/src/client/style.css" rel="stylesheet" />
        </head>
        <body>
          <div id="root">{children}</div>
        </body>
      </html>
    );
  },
  { docType: true, stream: true },
);
