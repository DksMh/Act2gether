// FAQ 아코디언 기능 구현
$(document).ready(function () {
  // 페이지 로드 시 모든 답변 숨기기 (aria-expanded="true"인 항목 제외)
  $(".faq-item").each(function () {
    const $question = $(this).find(".faq-question");
    const $answer = $(this).find(".faq-answer");
    const $icon = $(this).find(".faq-toggle-icon");

    if ($question.attr("aria-expanded") === "true") {
      $answer.show();
      $icon.text("▲");
    } else {
      $answer.hide();
      $icon.text("▼");
      $question.attr("aria-expanded", "false");
    }
  });

  // FAQ 질문 클릭 이벤트
  $(".faq-question").on("click", function () {
    const $this = $(this);
    const $faqItem = $this.closest(".faq-item");
    const $answer = $faqItem.find(".faq-answer");
    const $icon = $this.find(".faq-toggle-icon");
    const isExpanded = $this.attr("aria-expanded") === "true";

    if (isExpanded) {
      // 현재 열려있는 경우 - 닫기
      $answer.slideUp(300);
      $icon.text("▼");
      $this.attr("aria-expanded", "false");
    } else {
      // 현재 닫혀있는 경우 - 열기
      $answer.slideDown(300);
      $icon.text("▲");
      $this.attr("aria-expanded", "true");
    }
  });

  // 키보드 접근성 지원 (Enter, Space 키)
  $(".faq-question").on("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      $(this).click();
    }
  });
});
