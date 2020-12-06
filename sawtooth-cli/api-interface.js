// api1: yeu cau tham gia he thong: makeJoinRequest(input: profile, output: {ok: true/false})
// profile: {universityName: "", nameInEnglish: "", address: "", email: "", phone: "", pubkey: "", description: ""}
// {ok: true} if make tx success, {ok: false} if some error when make tx

// subscription:
// event1: khi BGD or TĐH khác bỏ phiếu đồng ý or từ chối
//  --> update profile trong mongodb, thêm 1 trường votes: [{name: "DHBKHN", decision: "accpet/decline", time: "2020-12-10"}, {...}]
// event2: khi kết thúc bỏ phiếu
//  --> update profile trong mogodb, update trường state: "accepted/declined"
