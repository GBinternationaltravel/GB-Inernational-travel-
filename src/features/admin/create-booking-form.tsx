"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AirportAutocomplete } from "@/features/flights/components/airport-autocomplete";
import { FlightFareBar } from "@/features/flights/components/flight-fare-bar";
import { FlightResultCard } from "@/features/flights/components/flight-result-card";
import { cabinClasses, genderOptions, passengerTypeLabels } from "@/config/booking";
import { countries } from "@/data/countries";
import {
  calculateCombinedOfferPriceSnapshot,
  calculateOfferPriceSnapshot,
} from "@/lib/booking/pricing";
import {
  isDomesticPakistanItinerary,
  passengerIdentitySubmitFields,
  resolvePassengerIdentityRules,
} from "@/lib/booking/passenger-identity";
import { formatPrice } from "@/lib/flights/filter-sort";
import { ADMIN_BOOKING_CHANNELS } from "@/lib/validations/admin-booking";
import type { FlightOffer } from "@/types/flight";

type TripType = "ONE_WAY" | "ROUND_TRIP";
type Channel = (typeof ADMIN_BOOKING_CHANNELS)[number];
type PassengerType = "ADULT" | "CHILD" | "INFANT";

type PassengerFormValue = {
  type: PassengerType;
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

function emptyPassenger(type: PassengerType): PassengerFormValue {
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

function buildPassengers(adults: number, children: number, infants: number): PassengerFormValue[] {
  const list: PassengerFormValue[] = [];
  for (let i = 0; i < adults; i += 1) list.push(emptyPassenger("ADULT"));
  for (let i = 0; i < children; i += 1) list.push(emptyPassenger("CHILD"));
  for (let i = 0; i < infants; i += 1) list.push(emptyPassenger("INFANT"));
  return list;
}

export function CreateBookingForm() {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>("PHONE");
  const [email, setEmail] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+92");
  const [phone, setPhone] = useState("");
  const [linkExistingCustomer, setLinkExistingCustomer] = useState(false);
  const [tripType, setTripType] = useState<TripType>("ONE_WAY");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [cabinClass, setCabinClass] = useState<(typeof cabinClasses)[number]["value"]>("ECONOMY");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [outboundOffers, setOutboundOffers] = useState<FlightOffer[]>([]);
  const [inboundOffers, setInboundOffers] = useState<FlightOffer[]>([]);
  const [outbound, setOutbound] = useState<FlightOffer | null>(null);
  const [inbound, setInbound] = useState<FlightOffer | null>(null);
  const [passengers, setPassengers] = useState(() => buildPassengers(1, 0, 0));
  const [specialRequests, setSpecialRequests] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const countryOptions = countries.map((country) => ({
    value: country.code,
    label: country.name,
  }));
  const dialOptions = countries.map((country) => ({
    value: country.dialCode,
    label: `${country.name} (${country.dialCode})`,
  }));

  const itineraryDomesticPakistan = useMemo(
    () =>
      isDomesticPakistanItinerary({
        origin,
        destination,
        tripType,
        outboundOffer: outbound,
        returnOffer: inbound,
      }),
    [destination, inbound, origin, outbound, tripType],
  );

  const pricing = useMemo(() => {
    if (!outbound) return null;
    return inbound
      ? calculateCombinedOfferPriceSnapshot([outbound, inbound])
      : calculateOfferPriceSnapshot(outbound);
  }, [inbound, outbound]);

  function identityRulesFor(nationality: string) {
    return resolvePassengerIdentityRules({
      itineraryDomesticPakistan,
      nationality,
      supplierCode: outbound?.supplierCode || outbound?.providerCode,
      returnSupplierCode: inbound?.supplierCode || inbound?.providerCode,
    });
  }

  function resetFlights() {
    setOutboundOffers([]);
    setInboundOffers([]);
    setOutbound(null);
    setInbound(null);
  }

  function syncPassengerCounts(nextAdults: number, nextChildren: number, nextInfants: number) {
    setAdults(nextAdults);
    setChildren(nextChildren);
    setInfants(nextInfants);
    setPassengers(buildPassengers(nextAdults, nextChildren, nextInfants));
    resetFlights();
  }

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSearching(true);
    resetFlights();
    try {
      const response = await fetch("/api/admin/flights/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripType,
          origin,
          destination,
          departureDate,
          returnDate: tripType === "ROUND_TRIP" ? returnDate : undefined,
          adults,
          children,
          infants,
          cabinClass,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        fields?: Record<string, string>;
        outbound?: FlightOffer[];
        inbound?: FlightOffer[];
      };
      if (!response.ok) {
        setFieldErrors(data.fields ?? {});
        setError(data.error ?? "Could not search inventory.");
        return;
      }
      setOutboundOffers(data.outbound ?? []);
      setInboundOffers(data.inbound ?? []);
      if (!(data.outbound ?? []).length) {
        setError("No outbound flights found in the published inventory for this search.");
      }
    } catch {
      setError("Could not search inventory.");
    } finally {
      setSearching(false);
    }
  }

  function updatePassenger<K extends keyof PassengerFormValue>(
    index: number,
    key: K,
    value: PassengerFormValue[K],
  ) {
    setPassengers((current) =>
      current.map((passenger, i) => (i === index ? { ...passenger, [key]: value } : passenger)),
    );
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[`passengers.${index}.${key}`];
      return next;
    });
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (submitting || !outbound) return;
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        channel,
        linkExistingCustomer,
        termsAccepted: true,
        offerId: outbound.id,
        returnOfferId: inbound?.id,
        tripType,
        origin,
        destination,
        departureDate,
        returnDate: tripType === "ROUND_TRIP" ? returnDate : undefined,
        cabinClass,
        adults,
        children,
        infants,
        contact: { email, phoneCountryCode, phone },
        specialRequests: specialRequests || undefined,
        passengers: passengers.map((passenger) => {
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
      };

      const response = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        error?: string;
        fields?: Record<string, string>;
        reference?: string;
      };
      if (!response.ok) {
        setFieldErrors(data.fields ?? {});
        setError(data.error ?? "Could not create booking.");
        return;
      }
      if (!data.reference) {
        setError("Could not create booking.");
        return;
      }
      router.push(`/admin/bookings/${encodeURIComponent(data.reference)}`);
    } catch {
      setError("Could not create booking.");
    } finally {
      setSubmitting(false);
    }
  }

  const canCreate =
    Boolean(outbound) &&
    (tripType === "ONE_WAY" || Boolean(inbound)) &&
    termsAccepted &&
    !submitting;

  return (
    <div className="space-y-6">
      {error ? <Alert variant="error">{error}</Alert> : null}

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5">
        <h2 className="font-display text-xl">Customer / contact</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Phone and WhatsApp customers do not need an account. The creating staff member is never
          stored as the booking customer.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Select
            label="Channel"
            name="channel"
            options={ADMIN_BOOKING_CHANNELS.map((value) => ({
              value,
              label: value === "PHONE" ? "Phone" : "WhatsApp",
            }))}
            value={channel}
            onChange={(event) => setChannel(event.target.value as Channel)}
          />
          <Input
            label="Customer email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors["contact.email"]}
          />
          <Select
            label="Country calling code"
            name="phoneCountryCode"
            options={dialOptions}
            value={phoneCountryCode}
            onChange={(event) => setPhoneCountryCode(event.target.value)}
            error={fieldErrors["contact.phoneCountryCode"]}
          />
          <Input
            label="Phone"
            name="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            error={fieldErrors["contact.phone"]}
            hint="Digits only, without the country code"
          />
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={linkExistingCustomer}
            onChange={(event) => setLinkExistingCustomer(event.target.checked)}
          />
          <span>
            Link an existing customer account only if this email already belongs to an active
            customer. Staff accounts are never linked.
          </span>
        </label>
      </section>

      <form
        onSubmit={onSearch}
        className="rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5"
      >
        <h2 className="font-display text-xl">Trip and inventory</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Search the same published inventory used on /flights. Multi-city is not supported.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Trip type"
            name="tripType"
            options={[
              { value: "ONE_WAY", label: "One way" },
              { value: "ROUND_TRIP", label: "Round trip" },
            ]}
            value={tripType}
            onChange={(event) => {
              setTripType(event.target.value as TripType);
              resetFlights();
            }}
          />
          <AirportAutocomplete
            label="From"
            name="origin"
            value={origin}
            onChange={(value) => {
              setOrigin(value);
              resetFlights();
            }}
            error={fieldErrors.origin}
          />
          <AirportAutocomplete
            label="To"
            name="destination"
            value={destination}
            onChange={(value) => {
              setDestination(value);
              resetFlights();
            }}
            error={fieldErrors.destination}
          />
          <DatePicker
            label="Departure"
            name="departureDate"
            value={departureDate}
            onChange={(event) => {
              setDepartureDate(event.target.value);
              resetFlights();
            }}
            error={fieldErrors.departureDate}
          />
          {tripType === "ROUND_TRIP" ? (
            <DatePicker
              label="Return"
              name="returnDate"
              value={returnDate}
              onChange={(event) => {
                setReturnDate(event.target.value);
                resetFlights();
              }}
              error={fieldErrors.returnDate}
            />
          ) : null}
          <Select
            label="Cabin"
            name="cabinClass"
            options={[...cabinClasses]}
            value={cabinClass}
            onChange={(event) => {
              setCabinClass(event.target.value as typeof cabinClass);
              resetFlights();
            }}
          />
          <Input
            label="Adults"
            name="adults"
            type="number"
            min={1}
            max={9}
            value={adults}
            onChange={(event) =>
              syncPassengerCounts(Number(event.target.value) || 1, children, infants)
            }
          />
          <Input
            label="Children"
            name="children"
            type="number"
            min={0}
            max={8}
            value={children}
            onChange={(event) =>
              syncPassengerCounts(adults, Number(event.target.value) || 0, infants)
            }
          />
          <Input
            label="Infants"
            name="infants"
            type="number"
            min={0}
            max={4}
            value={infants}
            onChange={(event) =>
              syncPassengerCounts(adults, children, Number(event.target.value) || 0)
            }
          />
        </div>
        <div className="mt-4">
          <Button type="submit" isLoading={searching}>
            Search inventory
          </Button>
        </div>
      </form>

      {outboundOffers.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl">Select outbound flight</h2>
          {outboundOffers.map((offer) => (
            <div
              key={offer.id}
              className={
                outbound?.id === offer.id ? "rounded-xl ring-2 ring-[var(--color-emerald)]" : ""
              }
            >
              <FlightResultCard
                offer={offer}
                priceMode={tripType === "ROUND_TRIP" ? "leg" : "trip"}
                selectLabel={outbound?.id === offer.id ? "Selected" : "Select outbound"}
                onSelect={(selected) => {
                  setOutbound(selected);
                  setInbound(null);
                }}
              />
            </div>
          ))}
        </section>
      ) : null}

      {tripType === "ROUND_TRIP" && outbound && inboundOffers.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl">Select return flight</h2>
          {inboundOffers.map((offer) => (
            <div
              key={offer.id}
              className={
                inbound?.id === offer.id ? "rounded-xl ring-2 ring-[var(--color-emerald)]" : ""
              }
            >
              <FlightResultCard
                offer={offer}
                priceMode="leg"
                selectLabel={inbound?.id === offer.id ? "Selected" : "Select return"}
                onSelect={setInbound}
              />
            </div>
          ))}
        </section>
      ) : null}

      {outbound && (tripType === "ONE_WAY" || inbound) ? (
        <form onSubmit={onCreate} className="space-y-6">
          <FlightFareBar
            outbound={{
              date: departureDate,
              origin,
              destination,
              fare: Math.round(outbound.totalPrice),
              selected: true,
            }}
            inbound={
              inbound
                ? {
                    date: returnDate,
                    origin: destination,
                    destination: origin,
                    fare: Math.round(inbound.totalPrice),
                    selected: true,
                  }
                : null
            }
            showReturn={tripType === "ROUND_TRIP"}
            seats={adults + children}
            infantFare={(outbound.infantFareTotal ?? 0) + (inbound?.infantFareTotal ?? 0)}
            isMock={outbound.isMock || Boolean(inbound?.isMock)}
          />

          {passengers.map((passenger, index) => {
            const identity = identityRulesFor(passenger.nationality);
            return (
              <section
                key={`${passenger.type}-${index}`}
                className="rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5"
              >
                <h2 className="font-display text-xl">
                  {passengerTypeLabels[passenger.type]} {index + 1}
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Input
                    label="First name"
                    name={`passengers-${index}-firstName`}
                    value={passenger.firstName}
                    onChange={(event) =>
                      updatePassenger(index, "firstName", event.target.value)
                    }
                    error={fieldErrors[`passengers.${index}.firstName`]}
                  />
                  <Input
                    label="Middle name (optional)"
                    name={`passengers-${index}-middleName`}
                    value={passenger.middleName}
                    onChange={(event) =>
                      updatePassenger(index, "middleName", event.target.value)
                    }
                    error={fieldErrors[`passengers.${index}.middleName`]}
                  />
                  {identity.showLastName ? (
                    <Input
                      label="Last name"
                      name={`passengers-${index}-lastName`}
                      value={passenger.lastName}
                      onChange={(event) =>
                        updatePassenger(index, "lastName", event.target.value)
                      }
                      error={fieldErrors[`passengers.${index}.lastName`]}
                    />
                  ) : null}
                  <DatePicker
                    label="Date of birth"
                    name={`passengers-${index}-dateOfBirth`}
                    value={passenger.dateOfBirth}
                    onChange={(event) =>
                      updatePassenger(index, "dateOfBirth", event.target.value)
                    }
                    error={fieldErrors[`passengers.${index}.dateOfBirth`]}
                  />
                  <Select
                    label="Gender"
                    name={`passengers-${index}-gender`}
                    options={[...genderOptions]}
                    value={passenger.gender}
                    onChange={(event) =>
                      updatePassenger(
                        index,
                        "gender",
                        event.target.value as PassengerFormValue["gender"],
                      )
                    }
                  />
                  <Select
                    label="Nationality"
                    name={`passengers-${index}-nationality`}
                    options={countryOptions}
                    value={passenger.nationality}
                    onChange={(event) =>
                      updatePassenger(index, "nationality", event.target.value)
                    }
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
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Passport number"
                      name={`passengers-${index}-passportNumber`}
                      value={passenger.passportNumber}
                      onChange={(event) =>
                        updatePassenger(index, "passportNumber", event.target.value)
                      }
                      error={fieldErrors[`passengers.${index}.passportNumber`]}
                    />
                    <Select
                      label="Passport issuing country"
                      name={`passengers-${index}-passportIssuingCountry`}
                      options={countryOptions}
                      value={passenger.passportIssuingCountry}
                      onChange={(event) =>
                        updatePassenger(index, "passportIssuingCountry", event.target.value)
                      }
                      error={fieldErrors[`passengers.${index}.passportIssuingCountry`]}
                    />
                    <DatePicker
                      label="Passport expiry"
                      name={`passengers-${index}-passportExpiry`}
                      value={passenger.passportExpiry}
                      onChange={(event) =>
                        updatePassenger(index, "passportExpiry", event.target.value)
                      }
                      error={fieldErrors[`passengers.${index}.passportExpiry`]}
                    />
                  </div>
                ) : null}
              </section>
            );
          })}

          <section className="rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5">
            <h2 className="font-display text-xl">Pricing summary</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Server-calculated. Staff cannot type or override this total. The saved booking uses
              the same pricing functions as public checkout.
            </p>
            {pricing ? (
              <dl className="mt-4 grid gap-2 text-sm sm:max-w-md">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-muted)]">Supplier fare</dt>
                  <dd>{formatPrice(pricing.supplierFare, pricing.currency)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-muted)]">Taxes</dt>
                  <dd>{formatPrice(pricing.taxes, pricing.currency)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-muted)]">GB service fee</dt>
                  <dd>{formatPrice(pricing.fees, pricing.currency)}</dd>
                </div>
                <div className="flex justify-between gap-4 text-base font-semibold">
                  <dt>Total due</dt>
                  <dd>{formatPrice(pricing.total, pricing.currency)}</dd>
                </div>
              </dl>
            ) : null}
            <p className="mt-3 text-xs text-[var(--color-muted)]">{pricing?.notice}</p>
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5">
            <h2 className="font-display text-xl">Terms</h2>
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
                required
              />
              <span>
                I confirmed the passenger, flight, and price details with the customer and they
                accept the booking terms. The booking will start as pending payment.
              </span>
            </label>
            <label className="mt-4 block text-sm font-medium" htmlFor="specialRequests">
              Special requests (optional)
            </label>
            <textarea
              id="specialRequests"
              className="mt-1.5 min-h-24 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              value={specialRequests}
              onChange={(event) => setSpecialRequests(event.target.value)}
              maxLength={500}
            />
          </section>

          <Button type="submit" size="lg" isLoading={submitting} disabled={!canCreate}>
            Create booking
          </Button>
        </form>
      ) : null}
    </div>
  );
}
