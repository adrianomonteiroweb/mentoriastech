import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopicStep } from "@/components/booking/steps/topic-step";
import type { TopicItem } from "@/lib/types/booking";

const mockTopics: TopicItem[] = [
  {
    id: "t1",
    name: "Carreira em programação",
    category: "free",
    description: "Orientação de carreira",
  },
  {
    id: "t2",
    name: "Desenvolvimento Web",
    category: "free",
    description: null,
  },
  {
    id: "t3",
    name: "Automações RPA",
    category: "free",
    description: "Automação com Python",
  },
];

describe("TopicStep", () => {
  const defaultProps = {
    topics: mockTopics,
    selectedTopicId: "",
    loading: false,
    onSelect: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
  };

  it("should render all topics", () => {
    render(<TopicStep {...defaultProps} />);

    expect(screen.getByText("Carreira em programação")).toBeInTheDocument();
    expect(screen.getByText("Desenvolvimento Web")).toBeInTheDocument();
    expect(screen.getByText("Automações RPA")).toBeInTheDocument();
  });

  it("should render topic descriptions when available", () => {
    render(<TopicStep {...defaultProps} />);

    expect(screen.getByText("Orientação de carreira")).toBeInTheDocument();
    expect(screen.getByText("Automação com Python")).toBeInTheDocument();
  });

  it("should show loading state", () => {
    render(<TopicStep {...defaultProps} loading={true} />);

    expect(screen.getByText("Carregando temas...")).toBeInTheDocument();
    expect(
      screen.queryByText("Carreira em programação"),
    ).not.toBeInTheDocument();
  });

  it("should show empty state when no topics", () => {
    render(<TopicStep {...defaultProps} topics={[]} />);

    expect(
      screen.getByText("Nenhum tema disponível no momento."),
    ).toBeInTheDocument();
  });

  it("should call onSelect when clicking a topic", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<TopicStep {...defaultProps} onSelect={onSelect} />);

    await user.click(screen.getByText("Carreira em programação"));
    expect(onSelect).toHaveBeenCalledWith(
      "t1",
      "Carreira em programação",
      "free",
    );
  });

  it("should show Voltar button", () => {
    render(<TopicStep {...defaultProps} />);
    expect(screen.getByText("Voltar")).toBeInTheDocument();
  });

  it("should call onBack when clicking Voltar", async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<TopicStep {...defaultProps} onBack={onBack} />);

    await user.click(screen.getByText("Voltar"));
    expect(onBack).toHaveBeenCalled();
  });

  it("should disable Próximo when no topic selected", () => {
    render(<TopicStep {...defaultProps} selectedTopicId="" />);
    const nextBtn = screen.getByText("Próximo");
    expect(nextBtn.closest("button")).toBeDisabled();
  });

  it("should enable Próximo when topic selected", () => {
    render(<TopicStep {...defaultProps} selectedTopicId="t1" />);
    const nextBtn = screen.getByText("Próximo");
    expect(nextBtn.closest("button")).not.toBeDisabled();
  });
});
