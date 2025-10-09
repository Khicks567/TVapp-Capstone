const handleNotificationSignup = vi.fn();

vi.mock("@/helpers/makenotifications", () => ({
  default: handleNotificationSignup,
}));

const NotificationButton = ({ showIdNumber }) => {
  return (
    <button onClick={() => handleNotificationSignup(showIdNumber)}>
      Get notified when the next episode airs!
    </button>
  );
};

describe("NotificationButton", () => {
  const MOCK_SHOW_ID = 54321;

  it("should call handleNotificationSignup with the correct showIdNumber on click", () => {
    render(<NotificationButton showIdNumber={MOCK_SHOW_ID} />);

    const button = screen.getByRole("button", {
      name: /Get notified when the next episode airs!/i,
    });

    fireEvent.click(button);

    expect(handleNotificationSignup).toHaveBeenCalledTimes(1);
    expect(handleNotificationSignup).toHaveBeenCalledWith(MOCK_SHOW_ID);
  });
});
