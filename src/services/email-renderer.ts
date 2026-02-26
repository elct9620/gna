import { injectable } from "tsyringe";
import { render } from "@react-email/render";
import type { ReactElement } from "react";

@injectable()
export class EmailRenderer {
  async renderToHtml(element: ReactElement): Promise<string> {
    return render(element);
  }

  async renderToPlainText(element: ReactElement): Promise<string> {
    return render(element, { plainText: true });
  }
}
