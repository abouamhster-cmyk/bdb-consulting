import "@testing-library/jest-dom";

// Mock de next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock simple de next/image (sans JSX)
jest.mock("next/image", () => ({
  __esModule: true,
  default: () => null,
}));
