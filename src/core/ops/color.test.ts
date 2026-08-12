import { describe, expect, it } from "vitest";
import { hexToRgb01 } from "./color";

describe("hexToRgb01", () => {
  it("hex rengi pdf-lib'in 0-1 aralığına dönüştürür", () => {
    expect(hexToRgb01("#ff8040")).toEqual([1, 128 / 255, 64 / 255]);
  });

  it("geçersiz rengi reddeder", () => {
    expect(() => hexToRgb01("gray")).toThrow("Geçersiz renk");
  });
});
