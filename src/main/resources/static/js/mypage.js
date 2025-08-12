
$(document).ready(function() {
    var emailData = $("#emailSpan").text().trim();
    const data = {
        email: emailData
    };
    console.log(emailData);
    $.ajax({
        url: "/profile/user",
        type: 'post',
        contentType: "application/json",
        data: JSON.stringify(data),
        success: function(res, textStatus, jqXHR) {
            console.log(res);
            $('#nickname').text(res.username);
            $('#ageGroup').text(res.age);
            $('#gender').text(res.gender);
            const interestsObj = JSON.parse(res.interests);

            renderPills('#prefRegions', interestsObj.preferredRegions);
            renderPills('#prefPlaces',   interestsObj.places);         // 혹은 destinations 등 실제 키
            renderPills('#prefFacilities', interestsObj.needs);        // 접근성/유아동 등
            renderPills('#prefThemes',   interestsObj.themes);
            console.log(interestsObj.preferredRegions); // ["서울"]
            console.log(interestsObj.preferredRegions[0]); // "서울"
            // $('#location').text(res.location);
        },
        error: function(request, status, error) {
            // console.log("Error:", error);
            // console.log("Response:", request.responseText);
        },
        complete: function(jqXHR, textStatus) {
            
        }
    });
});


// 선호 데이터 넣는 함수
function renderPills(containerSelector, items) {
  const $wrap = $(containerSelector);
  $wrap.empty();

  if (!items || items.length === 0) {
    // 없으면 표시를 생략하거나 기본 텍스트
    // $wrap.append('<span class="pill">없음</span>');
    return;
  }

  items.forEach((txt) => {
    $wrap.append($('<span/>', { class: 'pill', text: txt }));
  });
}