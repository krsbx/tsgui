export interface AppMetadata {
  /**
   * Machine readable app slug (used for filenames and directory names)
   * @example "vulcania"
   */
  name: string;
  /**
   * Human readable app name
   * @example "Vulcania"
   */
  displayName: string;
  /**
   * Author or creator of the app
   * @example "KRSBX"
   */
  author: string | null;
  /**
   * Description of the app
   * @example "Vulcania is a framework for building apps"
   */
  description: string | null;
  /**
   * Version of the app
   * @example "1.0.0"
   */
  version: `${number}.${number}.${number}` | (string & {}) | null;
  /**
   * Required for MacOS / Linux
   * @example "com.krsbx.vulcania"
   */
  bundleId: string;
  /**
   * Icon of the app
   * @example "./icon.png"
   */
  icon: string | null;
}

export interface WindowsMetadata extends AppMetadata {
  /** Company name embedding */
  companyName?: string;
  /** Legal copyright notice */
  copyright?: string;
  /** Internal file description */
  fileDescription?: string;
}

export interface MacOSMetadata extends AppMetadata {
  /** App category for the Mac App Store / Finder (e.g., 'public.app-category.developer-tools') */
  category?: string;
  /** Minimum macOS version target */
  minimumSystemVersion?: string;
}

export interface LinuxMetadata extends AppMetadata {
  /**
   * Desktop file categories
   * @example ['Utility', 'Development']
   */
  categories?: string[];
  /** Generic name of the application */
  genericName?: string;
}
