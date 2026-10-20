import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bookOnWhatsAppHref, quoteOnWhatsAppHref } from "@/lib/flights/whatsapp-booking";

describe("WhatsApp booking links", () => {
  it("opens the UAE WhatsApp number with the published fare details", () => {
    const href = bookOnWhatsAppHref({
      origin: "Islamabad (ISB)",
      destination: "Skardu (KDU)",
      date: "20 Oct 2026",
      airline: "PIA",
      flightTime: "07:00–08:15",
      passengers: "2 Adults",
      farePkr: 19020,
      pagePath: "/flights/results?from=ISB&to=KDU",
    });
    const url = new URL(href);
    assert.equal(url.origin + url.pathname, "https://wa.me/971522051485");
    const text = url.searchParams.get("text") ?? "";
    assert.match(text, /Islamabad \(ISB\) to Skardu \(KDU\)/);
    assert.match(text, /Date: 20 Oct 2026/);
    assert.match(text, /Airline: PIA/);
    assert.match(text, /Flight time: 07:00–08:15/);
    assert.match(text, /Passengers: 2 Adults/);
    assert.match(text, /Fare: PKR 19,020/);
    assert.match(text, /\/flights\/results\?from=ISB&to=KDU/);
    assert.match(text, /not a ticket/);
  });

  it("omits a fare when none is published", () => {
    const href = quoteOnWhatsAppHref({
      origin: "Hunza",
      destination: "Hunza",
      pagePath: "/destinations/pakistan/hunza",
      intro: "Hi GB International Travel, please quote a trip to Hunza.",
    });
    const text = new URL(href).searchParams.get("text") ?? "";
    assert.match(text, /quote a trip to Hunza/);
    assert.equal(text.includes("Fare:"), false);
    assert.match(text, /quote request, not a ticket/);
  });
});
