"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Alert } from "@/components/ui/alert";
import { genderOptions, passengerTypeLabels } from "@/config/booking";
import { countries } from "@/data/countries";
import type { SelectedFlightState } from "@/lib/flights/selection";
import {
  bookingDraftSchemaForItinerary,
  getBookingFieldErrors,
  type PassengerInput,
} from "@/lib/validations/booking";
import { formatPrice } from "@/lib/flights/filter-sort";
import {
  calculateCombinedOfferPriceSnapshot,
  calculateMockPriceSnapshot,
} from "@/lib/booking/pricing";
import { FlightFareBar } from "@/features/flights/components/flight-fare-bar";
import {
  isDomesticPakistanItinerary,
  passengerIdentitySubmitFields,
  resolvePassengerIdentityRules,
} from "@/lib/booking/passenger-identity";

type PassengerFormValue = {
  type: "ADULT" | "CHILD" | "INFANT";
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";
  nationality: string;
  passportNumber: string;
  passportIssuingCountry: string;
  passportExpiry: string;
};

function emptyPassenger(type: PassengerFormValue["type"]): PassengerFormValue {
  return {
    type,
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "UNSPECIFIED",
    nationality: "PK",
    passportNumber: "",
    passportIssuingCountry: "PK",
    passportExpiry: "",
  };
}

function buildInitialPassengers(search: SelectedFlightState["search"]): PassengerFormValue[] {
  const list: PassengerFormValue[] = [];
  for (let i = 0; i < search.adults; i += 1) list.push(emptyPassenger("ADULT"));
  for (let i = 0; i < (search.children ?? 0); i += 1) list.push(emptyPassenger("CHILD"));
  for (let i = 0; i < (search.infants ?? 0); i += 1) list.push(emptyPassenger("INFANT"));
  return list;
}

export function PassengerDetailsForm({
  selection,
}: {
  selection: SelectedFlightState;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [passengers, setPassengers] = useState(() => buildInitialPassengers(selection.search));
  const [email, setEmail] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+92");
  const [phone, setPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const itineraryDomesticPakistan = useMemo(
    () =>
      isDomesticPakistanItinerary({
        origin: selection.search.origin,
        destination: selection.search.destination,
        tripType: selection.search.tripType,
        outboundOffer: selection.offer,
        returnOffer: selection.returnOffer,
      }),
    [
      selection.offer,
      selection.returnOffer,
      selection.search.destination,
      selection.search.origin,
      selection.search.tripType,
    ],
  );

  const itineraryKey = [
    selection.search.origin,
    selection.search.destination,
    selection.search.tripType,
    selection.offer.supplierCode || selection.offer.providerCode,
    selection.returnOffer?.supplierCode || selection.returnOffer?.providerCode || "",
    itineraryDomesticPakistan ? "domestic" : "international",
  ].join(":");

  const didMountItinerary = useRef(false);
  const passengersRef = useRef(passengers);
  passengersRef.current = passengers;

  const estimate = useMemo(
    () =>
      selection.returnOffer
        ? calculateCombinedOfferPriceSnapshot([selection.offer, selection.returnOffer])
        : calculateMockPriceSnapshot(selection.offer),
    [selection.offer, selection.returnOffer],
  );

  const countryOptions = countries.map((country) => ({
    value: country.code,
    label: country.name,
  }));

  const dialOptions = countries.map((country) => ({
    value: country.dialCode,
    label: `${country.name} (${country.dialCode})`,
  }));

  function identityRulesFor(nationality: string) {
    return resolvePassengerIdentityRules({
      itineraryDomesticPakistan,
      nationality,
      supplierCode: selection.offer.supplierCode || selection.offer.providerCode,
      returnSupplierCode:
        selection.returnOffer?.supplierCode || selection.returnOffer?.providerCode,
    });
  }

  function parseDraft(nextPassengers: PassengerFormValue[]) {
    return bookingDraftSchemaForItinerary({
      outboundOffer: selection.offer,
      returnOffer: selection.returnOffer,
    }).safeParse(buildDraftPayload(nextPassengers));
  }

  function buildDraftPayload(nextPassengers: PassengerFormValue[]) {
    return {
      offerId: selection.offer.id,
      returnOfferId: selection.returnOffer?.id,
      tripType: selection.search.tripType,
      origin: selection.search.origin,
      destination: selection.search.destination,
      departureDate: selection.search.departureDate,
      returnDate: selection.search.returnDate,
      cabinClass: selection.search.cabinClass,
      adults: selection.search.adults,
      children: selection.search.children ?? 0,
      infants: selection.search.infants ?? 0,
      supplierCode: selection.offer.supplierCode || selection.offer.providerCode,
      returnSupplierCode:
        selection.returnOffer?.supplierCode || selection.returnOffer?.providerCode,
      contact: {
        email,
        phoneCountryCode,
        phone,
      },
      passengers: nextPassengers.map((passenger): PassengerInput => {
        const identity = passengerIdentitySubmitFields(
          passenger,
          identityRulesFor(passenger.nationality),
        );
        return {
          type: passenger.type,
          firstName: passenger.firstName,
          middleName: passenger.middleName || undefined,
          lastName: identity.lastName,
          dateOfBirth: passenger.dateOfBirth,
          gender: passenger.gender,
          nationality: passenger.nationality,
          passportNumber: identity.passportNumber,
          passportIssuingCountry: identity.passportIssuingCountry,
          passportExpiry: identity.passportExpiry,
        };
      }),
      specialRequests: specialRequests || undefined,
    };
  }

  function revalidateIdentity(nextPassengers: PassengerFormValue[]) {
    const parsed = parseDraft(nextPassengers);
    setFieldErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(next)) {
        if (
          key.includes("lastName") ||
          key.includes("passport") ||
          key.includes("nationality")
        ) {
          delete next[key];
        }
      }
      if (!parsed.success) {
        const incoming = getBookingFieldErrors(parsed.error);
        for (const [key, message] of Object.entries(incoming)) {
          if (
            key.includes("lastName") ||
            key.includes("passport") ||
            key.includes("nationality")
          ) {
            next[key] = message;
          }
        }
      }
      return next;
    });
  }

  function updatePassenger<K extends keyof PassengerFormValue>(
    index: number,
    key: K,
    value: PassengerFormValue[K],
  ) {
    const nextPassengers = passengers.map((passenger, i) =>
      i === index ? { ...passenger, [key]: value } : passenger,
    );
    setPassengers(nextPassengers);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[`passengers.${index}.${key}`];
      return next;
    });
    if (key === "nationality") {
      revalidateIdentity(nextPassengers);
    }
  }

  useEffect(() => {
    if (!didMountItinerary.current) {
      didMountItinerary.current = true;
      return;
    }
    revalidateIdentity(passengersRef.current);
    // Identity fields only — latest passengers are read from the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itineraryKey]);

  function focusFirstError(errors: Record<string, string>) {
    const firstKey = Object.keys(errors)[0];
    if (!firstKey || !formRef.current) return;
    const safeName = firstKey.replace(/\./g, "-");
    const el = formRef.current.querySelector<HTMLElement>(`[data-field="${safeName}"]`);
    el?.focus();
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = parseDraft(passengers);
    if (!parsed.success) {
      const errors = getBookingFieldErrors(parsed.error);
      setFieldErrors(errors);
      setFormError(errors.form ?? "Please check the highlighted fields.");
      focusFirstError(errors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/bookings/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await response.json()) as {
        error?: string;
        fields?: Record<string, string>;
        reference?: string;
      };

      if (!response.ok) {
        if (data.fields) {
          setFieldErrors(data.fields);
          focusFirstError(data.fields);
        }
        setFormError(data.error ?? "We couldn't save your booking. Please try again.");
        return;
      }

      if (!data.reference) {
        setFormError("We couldn't save your booking. Please try again.");
        return;
      }

      router.push(`/booking/review?ref=${encodeURIComponent(data.reference)}`);
    } catch {
      setFormError("We couldn't save your booking right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-8" noValidate>
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <FlightFareBar
        outbound={{
          date: selection.search.departureDate,
          origin: selection.search.origin,
          destination: selection.search.destination,
          fare: Math.round(selection.offer.totalPrice),
          selected: true,
        }}
        inbound={
          selection.returnOffer
            ? {
                date: selection.search.returnDate ?? "",
                origin: selection.search.destination,
                destination: selection.search.origin,
                fare: Math.round(selection.returnOffer.totalPrice),
                selected: true,
              }
            : null
        }
        showReturn={selection.search.tripType === "ROUND_TRIP"}
        isMock={selection.offer.isMock || Boolean(selection.returnOffer?.isMock)}
      />

      <Alert variant="info">
        Passenger details are stored securely for this booking draft. Passport numbers are never
        shown in URLs or logs.
      </Alert>

      {passengers.map((passenger, index) => {
        const identity = identityRulesFor(passenger.nationality);
        return (
        <section
          key={`${passenger.type}-${index}`}
          className="rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5"
          aria-labelledby={`passenger-${index}-title`}
        >
          <h2 id={`passenger-${index}-title`} className="font-display text-xl">
            {passengerTypeLabels[passenger.type]} {index + 1}
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              name={`passengers-${index}-firstName`}
              data-field={`passengers-${index}-firstName`}
              value={passenger.firstName}
              onChange={(event) => updatePassenger(index, "firstName", event.target.value)}
              error={fieldErrors[`passengers.${index}.firstName`]}
              autoComplete="given-name"
            />
            <Input
              label="Middle name (optional)"
              name={`passengers-${index}-middleName`}
              data-field={`passengers-${index}-middleName`}
              value={passenger.middleName}
              onChange={(event) => updatePassenger(index, "middleName", event.target.value)}
              error={fieldErrors[`passengers.${index}.middleName`]}
              autoComplete="additional-name"
            />
            {identity.showLastName ? (
              <Input
                label="Last name"
                name={`passengers-${index}-lastName`}
                data-field={`passengers-${index}-lastName`}
                value={passenger.lastName}
                onChange={(event) => updatePassenger(index, "lastName", event.target.value)}
                error={fieldErrors[`passengers.${index}.lastName`]}
                autoComplete="family-name"
              />
            ) : null}
            <DatePicker
              label="Date of birth"
              name={`passengers-${index}-dateOfBirth`}
              data-field={`passengers-${index}-dateOfBirth`}
              value={passenger.dateOfBirth}
              onChange={(event) => updatePassenger(index, "dateOfBirth", event.target.value)}
              error={fieldErrors[`passengers.${index}.dateOfBirth`]}
            />
            <Select
              label="Gender"
              name={`passengers-${index}-gender`}
              data-field={`passengers-${index}-gender`}
              options={[...genderOptions]}
              value={passenger.gender}
              onChange={(event) =>
                updatePassenger(
                  index,
                  "gender",
                  event.target.value as PassengerFormValue["gender"],
                )
              }
              error={fieldErrors[`passengers.${index}.gender`]}
            />
            <Select
              label="Nationality / citizenship"
              name={`passengers-${index}-nationality`}
              data-field={`passengers-${index}-nationality`}
              options={countryOptions}
              value={passenger.nationality}
              onChange={(event) => updatePassenger(index, "nationality", event.target.value)}
              error={fieldErrors[`passengers.${index}.nationality`]}
            />
          </div>
          {itineraryDomesticPakistan ? (
            <p className="mt-3 text-xs text-[var(--color-muted)]">
              Pakistani travelers do not need passport details on domestic Pakistan flights.
              Foreign travelers still do.
            </p>
          ) : null}

          {identity.showPassport ? (
            <>
              <h3 className="mt-6 text-sm font-semibold tracking-wide text-[var(--color-muted)] uppercase">
                Travel document
              </h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Input
                  label="Passport number"
                  name={`passengers-${index}-passportNumber`}
                  data-field={`passengers-${index}-passportNumber`}
                  value={passenger.passportNumber}
                  onChange={(event) => updatePassenger(index, "passportNumber", event.target.value)}
                  error={fieldErrors[`passengers.${index}.passportNumber`]}
                  autoComplete="off"
                />
                <Select
                  label="Passport issuing country"
                  name={`passengers-${index}-passportIssuingCountry`}
                  data-field={`passengers-${index}-passportIssuingCountry`}
                  options={countryOptions}
                  value={passenger.passportIssuingCountry}
                  onChange={(event) =>
                    updatePassenger(index, "passportIssuingCountry", event.target.value)
                  }
                  error={fieldErrors[`passengers.${index}.passportIssuingCountry`]}
                />
                <DatePicker
                  label="Passport expiry date"
                  name={`passengers-${index}-passportExpiry`}
                  data-field={`passengers-${index}-passportExpiry`}
                  value={passenger.passportExpiry}
                  onChange={(event) => updatePassenger(index, "passportExpiry", event.target.value)}
                  error={fieldErrors[`passengers.${index}.passportExpiry`]}
                />
              </div>
            </>
          ) : null}
        </section>
        );
      })}

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5">
        <h2 className="font-display text-xl">Contact information</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          We&apos;ll use this to send booking updates later. No messages are sent in this phase.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            label="Email"
            name="email"
            type="email"
            data-field="contact-email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors["contact.email"]}
            autoComplete="email"
          />
          <Select
            label="Country calling code"
            name="phoneCountryCode"
            data-field="contact-phoneCountryCode"
            options={dialOptions}
            value={phoneCountryCode}
            onChange={(event) => setPhoneCountryCode(event.target.value)}
            error={fieldErrors["contact.phoneCountryCode"]}
          />
          <Input
            label="Phone"
            name="phone"
            data-field="contact-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            error={fieldErrors["contact.phone"]}
            autoComplete="tel"
            hint="Digits only, without the country code"
          />
        </div>
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5">
        <h2 className="font-display text-xl">Special requests</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Optional. Special requests are not guaranteed and may require airline/supplier confirmation.
        </p>
        <label className="mt-4 block text-sm font-medium" htmlFor="specialRequests">
          Notes
        </label>
        <textarea
          id="specialRequests"
          name="specialRequests"
          data-field="specialRequests"
          className="mt-1.5 min-h-28 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
          value={specialRequests}
          onChange={(event) => setSpecialRequests(event.target.value)}
          maxLength={500}
        />
        {fieldErrors.specialRequests ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.specialRequests}</p>
        ) : null}
      </section>

      <div className="sticky bottom-0 z-20 -mx-4 border-t border-[var(--color-border)] bg-white/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:rounded-xl sm:border sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[var(--color-muted)]">Estimated total</p>
            <p className="font-display text-2xl">
              {formatPrice(estimate.total, estimate.currency)}
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">Includes all taxes and fees.</p>
          </div>
          <Button type="submit" size="lg" className="w-full sm:w-auto" isLoading={submitting}>
            Continue to Review
          </Button>
        </div>
      </div>
    </form>
  );
}
