export { defineAuthConfig } from "./config/defineAuthConfig";
export type {
  AuthConfig,
  AuthConfigLoadResult,
  AuthCredentials,
  AuthCredentialsResolver,
  AuthLoginContext,
  AuthProfileConfig,
  AuthValidateContext,
  AuthValidateResult,
} from "./config/types";

export { createAuthTest } from "./fixtures/createAuthTest";
export { authTest } from "./fixtures/createAuthTest";
export type {
  AuthTest,
  AuthTestOptions,
  AuthTestWithExpect,
  CreateAuthTestOptions,
} from "./fixtures/createAuthTest";
