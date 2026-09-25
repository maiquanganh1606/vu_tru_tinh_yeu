export const clamp = n => Math.max(0, Math.min(1,n));
export const ease = n => { n=clamp(n); return n*n*(3-2*n); };
export const lerp = (a,b,n) => a+(b-a)*n;
export const shotTime = shot => shot.sample ?? (shot.start+shot.end)/2;
export const films={
    journey:{duration:33, destination:'feast', title:'HÀNH TRÌNH LÊN CUNG TRĂNG', skip:'Đến mâm cỗ ↗', shots:[
      {id:'ignite',start:0,end:3.2,kicker:'I · CHIẾC ĐÈN MỞ LỐI',title:'Năm cánh sáng.<br><em>Một lối lên trăng.</em>',description:'Giữ lấy ánh sáng nhỏ này. Đêm hội đang chờ mình phía trước.'},
      {id:'flight',start:3.2,end:8,kicker:'II · QUA MIỀN MÂY BẠC',title:'Theo một vì sao,<br>đến miền cổ tích.',description:'Chiếc đèn dẫn mình qua những tầng mây, về phía ánh trăng.'},
      {id:'palace',start:8,end:13.5,kicker:'III · CUNG TRĂNG',title:'Cửa cung trăng<br><em>đã mở.</em>',description:'Dưới vòm trời dát bạc, một đêm đoàn viên bắt đầu.'},
      {id:'cuoi',start:13.5,end:20,kicker:'IV · CHÚ CUỘI DƯỚI TÁN ĐA',title:'Cuội đã chờ mình<br>từ lúc trăng lên.',description:'“Lên đây ngồi một chút. Chuyện dưới trần, cứ kể trăng nghe.”'},
      {id:'lion',start:20,end:29,kicker:'V · TIẾNG TRỐNG ĐÊM HỘI',title:'Trăng sáng rồi.<br><em>Mình vào hội thôi.</em>',description:'Lân nghiêng đầu chào, chân bước theo trống, sắc đỏ sáng cả sân trăng.'},
      {id:'feast',start:29,end:33,kicker:'VI · MỘT KHOẢNG ĐOÀN VIÊN',title:'Sau tiếng hội,<br>là một chút ngọt ngào.',description:'Mâm cỗ đã sẵn. Mình cùng ngồi lại dưới trăng nhé.'}
    ]},
    outro:{duration:22,destination:'ending',title:'ƯỚC NGUYỆN BAY LÊN CUNG TRĂNG',skip:'Đến kết thúc ↗',shots:[
      {id:'letter',start:0,end:4,kicker:'I · MỘT ĐIỀU GỬI TRĂNG',title:'Gấp lại một ước nguyện.<br><em>Mở ra một hy vọng.</em>',description:'Những điều thật lòng luôn có một nơi để đến.'},
      {id:'wish-flight',start:4,end:10,kicker:'II · QUA DẢI NGÂN HÀ',title:'Bay lên nhé,<br>điều ước của mình.',description:'Một cánh thư, một vệt sáng, một con đường về cung trăng.'},
      {id:'receive',sample:15,start:10,end:16,kicker:'III · CHỊ HẰNG VÀ CHÚ CUỘI',title:'Chị Hằng đón lấy.<br><em>Cuội giữ lời thương.</em>',description:'Ước nguyện khẽ sáng lên trong đôi tay đang chờ.'},
      {id:'seal',start:16,end:22,kicker:'IV · HẸN MỘT MÙA TRĂNG SAU',title:'Trăng giữ điều ước.<br><em>Mình giữ nhau.</em>',description:'Đêm hội khép lại. Điều dịu dàng vẫn ở lại cùng mình.'}
    ]}
  };
