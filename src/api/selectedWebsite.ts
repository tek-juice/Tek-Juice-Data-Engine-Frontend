import { listWebsites, type Website } from './websites';

/** The website the user selected (shell switcher), else the account's websites. */
export async function websitesFor(selected: Website | null): Promise<Website[]> {
  return selected ? [selected] : listWebsites();
}
