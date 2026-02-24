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
          <ViteClient />
          <ReactRefresh />
          <Script src="/src/client/index.tsx" />
          <Link href="/src/style.css" rel="stylesheet" />
        </head>
        <body>
          <div id="root">{children}</div>
        </body>
      </html>
    );
  },
  { docType: true, stream: true },
);
