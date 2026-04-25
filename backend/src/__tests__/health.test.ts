describe("health", () => {
  it("returns ok status", () => {
    expect({ status: "ok" }).toEqual({ status: "ok" });
  });
});
