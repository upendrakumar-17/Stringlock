import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

test("renders the StringLock encryption workspace", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: "StringLock" })).toBeInTheDocument();
  expect(screen.getByLabelText("Input")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Encrypt" })).toHaveLength(2);

  fireEvent.change(screen.getByLabelText("Input"), { target: { value: "secret" } });
  fireEvent.click(screen.getAllByRole("button", { name: "Encrypt" })[1]);

  expect(screen.getByRole("heading", { name: "Set Encryption Password" })).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Choose a password...")).toBeInTheDocument();
});
