export const STORAGE_TEST_CASES = [
  { id: "product.anon-upload-denied", area: "product-media", mutation: true, expected: "denied" },
  { id: "product.customer-upload-denied", area: "product-media", mutation: true, expected: "denied" },
  { id: "product.studio-upload", area: "product-media", mutation: true, expected: "allowed" },
  { id: "product.studio-update", area: "product-media", mutation: true, expected: "allowed" },
  { id: "product.studio-delete", area: "product-media", mutation: true, expected: "allowed" },
  { id: "product.invalid-product-path-denied", area: "product-media", mutation: true, expected: "denied" },
  { id: "product.invalid-mime-denied", area: "product-media", mutation: true, expected: "denied" },
  { id: "product.oversized-file-denied", area: "product-media", mutation: true, expected: "denied" },
  { id: "product.public-read-documented", area: "product-media", mutation: false, expected: "documented" },
  { id: "customer.anon-upload-denied", area: "customer-customizations", mutation: true, expected: "denied" },
  { id: "customer.owner-upload", area: "customer-customizations", mutation: true, expected: "allowed" },
  { id: "customer.cross-owner-upload-denied", area: "customer-customizations", mutation: true, expected: "denied" },
  { id: "customer.owner-read", area: "customer-customizations", mutation: false, expected: "allowed" },
  { id: "customer.cross-owner-read-denied", area: "customer-customizations", mutation: false, expected: "denied" },
  { id: "customer.cross-owner-update-denied", area: "customer-customizations", mutation: true, expected: "denied" },
  { id: "customer.cross-owner-delete-denied", area: "customer-customizations", mutation: true, expected: "denied" },
  { id: "customer.studio-operational-access", area: "customer-customizations", mutation: false, expected: "allowed" },
  { id: "customer.anon-read-denied", area: "customer-customizations", mutation: false, expected: "denied" },
  { id: "customer.invalid-depth-denied", area: "customer-customizations", mutation: true, expected: "denied" },
  { id: "customer.invalid-uuid-denied", area: "customer-customizations", mutation: true, expected: "denied" },
  { id: "customer.invalid-mime-denied", area: "customer-customizations", mutation: true, expected: "denied" },
  { id: "customer.oversized-file-denied", area: "customer-customizations", mutation: true, expected: "denied" },
  { id: "signed.owner-preview", area: "customer-customizations", mutation: false, expected: "allowed" },
  { id: "signed.cross-owner-preview-denied", area: "customer-customizations", mutation: false, expected: "denied" },
  { id: "signed.expired-preview", area: "customer-customizations", mutation: false, expected: "denied" },
  { id: "signed.public-url-denied", area: "customer-customizations", mutation: false, expected: "denied" },
  { id: "api.unauthorized-signed-url-request", area: "application-api", mutation: false, expected: "pending" },
  { id: "api.studio-auth-required", area: "application-api", mutation: false, expected: "pending" },
  { id: "api.customer-auth-required", area: "application-api", mutation: false, expected: "pending" },
  { id: "api.same-origin-required", area: "application-api", mutation: false, expected: "pending" },
];

export const TEST_DATA_MANIFEST = {
  testUsers: [
    { role: "studio", count: 1, requirement: "existing authenticated account with is_studio_member() = true" },
    { role: "customer-a", count: 1, requirement: "existing authenticated account without Studio membership" },
    { role: "customer-b", count: 1, requirement: "separate existing authenticated account without Studio membership" },
  ],
  product: {
    existingProductIdRequired: true,
    source: "ZEROCRAFT_STORAGE_TEST_PRODUCT_ID",
    recordsCreated: 0,
    recordsModified: 0,
  },
  objects: {
    productMedia: "products/{existing-product-id}/{uuid}.png",
    customerA: "{customer-a-user-id}/{uuid}.png",
    customerB: "{customer-b-user-id}/{uuid}.png",
    localFixtures: ["valid.png", "valid.pdf", "invalid.svg", "oversized.bin"],
  },
  sizes: {
    validImageBytes: 3,
    invalidMimeBytes: 3,
    oversizedProductMediaBytes: 10 * 1024 * 1024 + 1,
    oversizedCustomizationBytes: 25 * 1024 * 1024 + 1,
  },
  expectedRemoteEffects: {
    successfulTests: "temporary Storage objects only",
    databaseRows: 0,
    products: 0,
    categories: 0,
    orders: 0,
    users: "0 created by this harness; accounts must be pre-provisioned",
  },
};

const PATHS = {
  product: "products/{approved-product-id}/{uuid}.png",
  customerA: "{customer-a-user-id}/{uuid}.png",
  customerB: "{customer-b-user-id}/{uuid}.png",
};

const EXECUTION_DEFINITIONS = {
  "product.anon-upload-denied": ["anonymous", "product-media", PATHS.product, "upload", "none"],
  "product.customer-upload-denied": ["customer-a", "product-media", PATHS.product, "upload", "none"],
  "product.studio-upload": ["studio", "product-media", PATHS.product, "upload", "delete object"],
  "product.studio-update": ["studio", "product-media", PATHS.product, "update", "delete object"],
  "product.studio-delete": ["studio", "product-media", PATHS.product, "delete", "already deleted by operation"],
  "product.invalid-product-path-denied": ["studio", "product-media", "products/not-a-product/not-a-uuid.png", "upload", "none"],
  "product.invalid-mime-denied": ["studio", "product-media", PATHS.product.replace(".png", ".svg"), "upload", "none"],
  "product.oversized-file-denied": ["studio", "product-media", PATHS.product, "upload", "none"],
  "customer.anon-upload-denied": ["anonymous", "customer-customizations", PATHS.customerA, "upload", "none"],
  "customer.owner-upload": ["customer-a", "customer-customizations", PATHS.customerA, "upload", "delete object"],
  "customer.cross-owner-upload-denied": ["customer-a", "customer-customizations", PATHS.customerB, "upload", "none"],
  "customer.owner-read": ["customer-a", "customer-customizations", PATHS.customerA, "download", "delete object later"],
  "customer.cross-owner-read-denied": ["customer-b", "customer-customizations", PATHS.customerA, "download", "delete object later"],
  "customer.cross-owner-update-denied": ["customer-b", "customer-customizations", PATHS.customerA, "update", "delete object later"],
  "customer.cross-owner-delete-denied": ["customer-b", "customer-customizations", PATHS.customerA, "delete", "delete object later"],
  "customer.studio-operational-access": ["studio", "customer-customizations", PATHS.customerA, "download", "delete object later"],
  "customer.anon-read-denied": ["anonymous", "customer-customizations", PATHS.customerA, "download", "delete object later"],
  "customer.invalid-depth-denied": ["customer-a", "customer-customizations", "{customer-a-user-id}/nested/{uuid}.png", "upload", "none"],
  "customer.invalid-uuid-denied": ["customer-a", "customer-customizations", "{customer-a-user-id}/not-a-uuid.png", "upload", "none"],
  "customer.invalid-mime-denied": ["customer-a", "customer-customizations", "{customer-a-user-id}/{uuid}.svg", "upload", "none"],
  "customer.oversized-file-denied": ["customer-a", "customer-customizations", PATHS.customerA, "upload", "none"],
  "signed.owner-preview": ["customer-a", "customer-customizations", PATHS.customerA, "signed URL + fetch", "delete object later"],
  "signed.cross-owner-preview-denied": ["customer-b", "customer-customizations", PATHS.customerA, "create signed URL", "delete object later"],
  "signed.expired-preview": ["anonymous fetch", "customer-customizations", PATHS.customerA, "fetch after expiry", "delete object later"],
  "signed.public-url-denied": ["anonymous fetch", "customer-customizations", PATHS.customerA, "public URL fetch", "delete object later"],
};

export const TEST_EXECUTION_MANIFEST = STORAGE_TEST_CASES
  .filter((test) => Object.hasOwn(EXECUTION_DEFINITIONS, test.id))
  .map((test) => {
    const [identity, bucket, objectPath, operation, cleanup] = EXECUTION_DEFINITIONS[test.id];
    return { caseId: test.id, identity, bucket, objectPath, operation, expectedOutcome: test.expected, cleanup };
  });
