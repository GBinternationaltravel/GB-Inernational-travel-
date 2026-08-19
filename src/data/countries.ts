/**
 * Common country list for nationality / passport / dial codes.
 * Expandable later; codes are ISO 3166-1 alpha-2.
 */

export type CountryOption = {
  code: string;
  name: string;
  dialCode: string;
};

export const countries: CountryOption[] = [
  { code: "PK", name: "Pakistan", dialCode: "+92" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966" },
  { code: "QA", name: "Qatar", dialCode: "+974" },
  { code: "TR", name: "Turkey", dialCode: "+90" },
  { code: "GB", name: "United Kingdom", dialCode: "+44" },
  { code: "US", name: "United States", dialCode: "+1" },
  { code: "CA", name: "Canada", dialCode: "+1" },
  { code: "MY", name: "Malaysia", dialCode: "+60" },
  { code: "TH", name: "Thailand", dialCode: "+66" },
  { code: "FR", name: "France", dialCode: "+33" },
  { code: "DE", name: "Germany", dialCode: "+49" },
  { code: "IT", name: "Italy", dialCode: "+39" },
  { code: "NL", name: "Netherlands", dialCode: "+31" },
  { code: "AU", name: "Australia", dialCode: "+61" },
  { code: "IN", name: "India", dialCode: "+91" },
  { code: "BD", name: "Bangladesh", dialCode: "+880" },
  { code: "CN", name: "China", dialCode: "+86" },
  { code: "JP", name: "Japan", dialCode: "+81" },
  { code: "SG", name: "Singapore", dialCode: "+65" },
];

export function getCountryByCode(code: string): CountryOption | undefined {
  return countries.find((country) => country.code === code.toUpperCase());
}
