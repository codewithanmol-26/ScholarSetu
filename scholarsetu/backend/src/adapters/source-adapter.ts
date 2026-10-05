// Every external system (DigiLocker, UIDAI, UDISE+, AISHE, NSP...) implements this.
// Add a new data source = add one class. The rest of the app does not change.
export interface SourceAdapter {
  name: string;
  fetch(studentRef: string): Promise<Record<string, unknown>>;
  verify(studentRef: string, claimed: Record<string, unknown>): Promise<number>; // confidence 0-100
}
