**Thuật Toán Trải Ngang Dữ Liệu Giám Sát Vệ Sinh Tay**

// THUẬT TOÁN TRẢI NGANG DỮ LIỆU (DATA FLATTENING) XUẤT FILE SPSS/STATA

// Tiêu chuẩn: WHO 5 Moments for Hand Hygiene (Đặc tả BRD \- Giai đoạn 1\)

// Định nghĩa hằng số: Danh mục 5 thời điểm vệ sinh tay theo tiêu chuẩn WHO \[1-3\]

CONSTANT WHO\_5\_MOMENTS \= \["T-TXNB", "T-TTVK", "S-DCT", "S-TXNB", "S-XQNB"\]

FUNCTION FlattenHandHygieneData(raw\_surveillance\_payload):

    // Khởi tạo mảng lưu trữ tập dữ liệu đã trải ngang (Dataset)

    ARRAY flattened\_dataset \= \[\]

    // Duyệt qua mảng chứa các "Cơ hội VST", mỗi cơ hội sẽ trở thành 1 Row độc lập \[3, 4\]

    FOR EACH co\_hoi IN raw\_surveillance\_payload.danh\_sach\_co\_hoi:

        // Khởi tạo cấu trúc dữ liệu cho 1 Hàng (Row) chứa thông tin hành chính và kết quả

        OBJECT current\_row \= {

            "thoi\_gian\_giam\_sat": raw\_surveillance\_payload.thoi\_gian\_giam\_sat,

            "id\_khoa\_phong": raw\_surveillance\_payload.id\_khoa\_phong,

            "id\_khu\_vuc": raw\_surveillance\_payload.id\_khu\_vuc,

            "id\_nguoi\_giam\_sat": raw\_surveillance\_payload.id\_nguoi\_giam\_sat,

            "id\_doi\_tuong\_giam\_sat": raw\_surveillance\_payload.id\_doi\_tuong\_giam\_sat,

            "hanh\_dong\_ve\_sinh\_tay": co\_hoi.hanh\_dong\_ve\_sinh\_tay,

            "dung\_ky\_thuat": co\_hoi.dung\_ky\_thuat,

            "du\_thoi\_gian": co\_hoi.du\_thoi\_gian,

            "co\_deo\_gang\_tay": co\_hoi.co\_deo\_gang\_tay

        }

        // Mảng chứa các thời điểm được giám sát viên chọn (Multiple choices)

        ARRAY selected\_moments \= co\_hoi.chi\_dinh\_ve\_sinh\_tay

        // Ràng buộc toàn vẹn dữ liệu lâm sàng: Cho phép chọn tối đa 2 thời điểm \[2, 3\]

        IF LENGTH(selected\_moments) \&gt; 2 THEN

            THROW Exception("DATA\_INTEGRITY\_ERROR: Vượt quá số lượng chỉ định tối đa (2) trên mỗi cơ hội.")

        END IF

        // Vòng lặp rẽ nhánh xử lý Data Flattening (Biến đa lựa chọn \-\&gt; Biến nhị phân) \[4\]

        FOR EACH moment IN WHO\_5\_MOMENTS:

            // Tạo định danh cột độc lập cho file Excel/SPSS

            STRING column\_name \= "IND\_" \+ moment

            // Đối chiếu giá trị mảng để gán nhãn nhị phân (Binary 1/0) \[4\]

            IF moment IN selected\_moments THEN

                current\_row\[column\_name\] \= 1 // Gán 1 nếu thời điểm có được chọn

            ELSE

                current\_row\[column\_name\] \= 0 // Gán 0 nếu thời điểm không được chọn

            END IF

        END FOR

        // Đẩy dòng dữ liệu đã được trải ngang và mã hóa nhị phân vào Dataset

        flattened\_dataset.APPEND(current\_row)

    END FOR

    RETURN flattened\_dataset

ENDFUNCTION

// THUẬT TOÁN KẾT XUẤT TỆP DỮ LIỆU ĐỊNH DẠNG BẢNG (TABULAR EXPORT)

FUNCTION ExportToSPSS\_Stata(flattened\_dataset):

    FILE export\_file \= INITIALIZE\_EXCEL\_WORKBOOK()

    // Cấu trúc Headers phẳng đảm bảo tương thích 100% với SPSS/Stata \[4\]

    export\_file.SET\_HEADERS(\[

        "thoi\_gian\_giam\_sat",

        "id\_khoa\_phong",

        "id\_khu\_vuc",

        "id\_nguoi\_giam\_sat",

        "id\_doi\_tuong\_giam\_sat",

        "IND\_T-TXNB",

        "IND\_T-TTVK",

        "IND\_S-DCT",

        "IND\_S-TXNB",

        "IND\_S-XQNB",

        "hanh\_dong\_ve\_sinh\_tay",

        "dung\_ky\_thuat",

        "du\_thoi\_gian",

        "co\_deo\_gang\_tay"

    \])

    export\_file.WRITE\_ROWS(flattened\_dataset)

    RETURN export\_file

ENDFUNCTION

\--------------------------------------------------------------------------------

**Hệ Thống Cảnh Báo Lỗi Kiểm Soát Nhiễm Khuẩn Trọng Yếu**

{

  "$schema": "http://json-schema.org/draft-07/schema\#",

  "title": "RedFlag\_Critical\_Errors\_Schema",

  "description": "Lược đồ định nghĩa cấu trúc dữ liệu và danh sách mã lỗi trọng yếu theo BRD và tiêu chuẩn KSNK",

  "type": "object",

  "properties": {

    "ten\_khoa": {

      "type": "string",

      "description": "Tên khoa/phòng diễn ra sự kiện giám sát"

    },

    "thoi\_gian": {

      "type": "string",

      "format": "date-time",

      "description": "Thời gian ghi nhận lỗi theo chuẩn ISO 8601"

    },

    "ten\_nguoi\_vi\_pham": {

      "type": "string",

      "description": "Tên đích danh của đối tượng bị giám sát"

    },

    "danh\_sach\_tieu\_chi": {

      "type": "array",

      "description": "Danh sách các tiêu chí được đánh giá trong phiên giám sát",

      "items": {

        "type": "object",

        "properties": {

          "ma\_loi": {

            "type": "string",

            "enum": \[

              "ERR\_MIX\_INFECTIOUS\_WASTE",

              "ERR\_MISSED\_HH\_ASEPTIC",

              "ERR\_MISSED\_HH\_CROSS\_TRANSMISSION",

              "ERR\_SHAKE\_INFECTIOUS\_LINEN",

              "ERR\_MIX\_CLEAN\_DIRTY\_TRANSPORT",

              "ERR\_SKIP\_ENDOSCOPE\_MANUAL\_CLEAN",

              "ERR\_ASEPTIC\_TECHNIQUE\_VIOLATION"

            \],

            "description": "Mã định danh hệ thống của các lỗi trọng yếu"

          },

          "noi\_dung\_loi\_trong\_yeu": {

            "type": "string",

            "enum": \[

              "Trộn lẫn rác lây nhiễm vào rác sinh hoạt",

              "Bỏ sót vệ sinh tay trước thủ thuật vô khuẩn (T-TTVK)",

              "Bỏ sót vệ sinh tay khi di chuyển giữa các người bệnh",

              "Giũ đồ vải lây nhiễm trong không khí",

              "Sử dụng chung xe vận chuyển đồ bẩn và sạch",

              "Bỏ qua bước làm sạch bằng tay đối với ống nội soi",

              "Vi phạm kỹ thuật vô khuẩn khi thay băng/chăm sóc đường truyền trung tâm"

            \]

          },

          "la\_loai\_trong\_yeu": {

            "type": "boolean",

            "description": "Cờ đánh dấu tiêu chí thuộc nhóm lỗi trọng yếu (Red Flag)"

          },

          "ket\_qua\_danh\_gia": {

            "type": "string",

            "enum": \[

              "Đạt",

              "Không đạt",

              "Không áp dụng"

            \]

          }

        },

        "required": \[

          "ma\_loi",

          "noi\_dung\_loi\_trong\_yeu",

          "la\_loai\_trong\_yeu",

          "ket\_qua\_danh\_gia"

        \],

        "additionalProperties": false

      }

    }

  },

  "required": \[

    "ten\_khoa",

    "thoi\_gian",

    "ten\_nguoi\_vi\_pham",

    "danh\_sach\_tieu\_chi"

  \],

  "additionalProperties": false

}

// Thuật toán phát hiện và kích hoạt Hệ thống Cảnh báo Đỏ (Red Flag Trigger)

FUNCTION ProcessObservationPayload(payload):

    // Khởi tạo mảng lưu trữ danh sách các lỗi trọng yếu phát hiện được

    ARRAY critical\_violations \= \[\]

    // Phân tích từng tiêu chí trong biểu mẫu giám sát

    FOR EACH criteria IN payload.danh\_sach\_tieu\_chi:

        // Logic rẽ nhánh: Kiểm tra điều kiện kích hoạt cảnh báo đỏ theo BRD

        IF criteria.la\_loai\_trong\_yeu \== TRUE AND criteria.ket\_qua\_danh\_gia \== "Không đạt" THEN

            critical\_violations.APPEND(criteria.noi\_dung\_loi\_trong\_yeu)

        END IF

    END FOR

    // Thực thi tiến trình nền (Background Worker) nếu tồn tại lỗi trọng yếu

    IF LENGTH(critical\_violations) \&gt; 0 THEN

        // Đóng gói tải trọng (Payload) cảnh báo khẩn cấp

        OBJECT webhook\_payload \= {

            "thong\_diep": "CẢNH BÁO KHẨN CẤP \- LỖI KSNK TRỌNG YẾU",

            "ten\_khoa": payload.ten\_khoa,

            "thoi\_gian": payload.thoi\_gian,

            "ten\_nguoi\_vi\_pham": payload.ten\_nguoi\_vi\_pham,

            "noi\_dung\_vi\_pham": critical\_violations

        }

        // Gọi Webhook API để gửi thông báo qua hệ thống tin nhắn nội bộ

        CALL TriggerWebhook("https://internal-api.bv103.vn/v1/webhook/red-flag-alert", webhook\_payload)

    END IF

ENDFUNCTION

// Thuật toán giao tiếp API ngoại vi

FUNCTION TriggerWebhook(endpoint\_url, data):

    TRY

        HTTP\_POST(

            URL \= endpoint\_url,

            HEADERS \= {

                "Content-Type": "application/json",

                "Authorization": "Bearer 

 \--------------- 

\#\#\# Ma Trận Giám Sát Vệ Sinh Tay Chuẩn KSNK

{ "$schema": "http://json-schema.org/draft-07/schema\#", "title": "Ma\_Tran\_Cach\_Ly\_Va\_Giam\_Sat\_Ve\_Sinh\_Tay", "description": "Cấu trúc lưu trữ mảng Cơ hội vệ sinh tay (Observation Opportunities) tuân thủ BRD KSNK \[1-3\]", "type": "array", "items": { "type": "object", "properties": { "chi\_dinh\_ve\_sinh\_tay": { "type": "array", "description": "5 thời điểm vệ sinh tay theo WHO \[1-3\]", "items": { "type": "string", "enum": \[ "T-TXNB", "T-TTVK", "S-DCT", "S-TXNB", "S-XQNB" \] }, "minItems": 1, "maxItems": 2 }, "hanh\_dong\_ve\_sinh\_tay": { "type": "string", "description": "Phân loại hành động thực hiện \[1, 3\]", "enum": \[ "Rửa tay nước", "Chà tay cồn", "Bỏ sót" \] }, "dung\_ky\_thuat": { "type": \[ "boolean", "null" \], "description": "Đánh giá kỹ thuật 6 bước \[1, 3\]" }, "du\_thoi\_gian": { "type": \[ "boolean", "null" \], "description": "Đánh giá thời lượng tiêu chuẩn \[1, 3\]" }, "co\_deo\_gang\_tay": { "type": \[ "boolean", "null" \], "description": "Đánh giá lạm dụng găng tay thay cho VST \[1-3\]" } }, "required": \[ "chi\_dinh\_ve\_sinh\_tay", "hanh\_dong\_ve\_sinh\_tay" \], "allOf": \[ { "if": { "properties": { "hanh\_dong\_ve\_sinh\_tay": { "const": "Bỏ sót" } } }, "then": { "properties": { "dung\_ky\_thuat": { "type": "null" }, "du\_thoi\_gian": { "type": "null" }, "co\_deo\_gang\_tay": { "type": "boolean" } }, "required": \[ "co\_deo\_gang\_tay" \] }, "else": { "properties": { "dung\_ky\_thuat": { "type": "boolean" }, "du\_thoi\_gian": { "type": "boolean" }, "co\_deo\_gang\_tay": { "type": "null" } }, "required": \[ "dung\_ky\_thuat", "du\_thoi\_gian" \] } } \], "additionalProperties": false } }

// Thuật toán xử lý rẽ nhánh giao diện (Conditional UI Rendering) \[1-3\] FUNCTION HandleActionChange(co\_hoi\_vst):

// Kiểm tra ràng buộc mảng chỉ định vệ sinh tay \[1, 2\]

IF LENGTH(co\_hoi\_vst.chi\_dinh\_ve\_sinh\_tay) \&gt; 2 THEN

    THROW Exception("Lỗi: Chỉ được chọn tối đa 2 thời điểm chỉ định.")

END IF

// Xử lý logic rẽ nhánh UI dựa trên giá trị hành động \[1-3\]

IF co\_hoi\_vst.hanh\_dong\_ve\_sinh\_tay \== "Bỏ sót" THEN

    // Vô hiệu hóa và xóa dữ liệu đánh giá kỹ thuật, thời gian \[1, 2\]

    UI.dung\_ky\_thuat.DISABLE()

    UI.du\_thoi\_gian.DISABLE()

    co\_hoi\_vst.dung\_ky\_thuat \= NULL

    co\_hoi\_vst.du\_thoi\_gian \= NULL

    // Kích hoạt và yêu cầu bắt buộc trường đánh giá lạm dụng găng tay \[1-3\]

    UI.co\_deo\_gang\_tay.ENABLE()

    UI.co\_deo\_gang\_tay.SET\_REQUIRED(TRUE)

ELSE IF co\_hoi\_vst.hanh\_dong\_ve\_sinh\_tay IN \["Rửa tay nước", "Chà tay cồn"\] THEN

    // Kích hoạt đánh giá kỹ thuật và thời gian \[1, 3\]

    UI.dung\_ky\_thuat.ENABLE()

    UI.du\_thoi\_gian.ENABLE()

    UI.dung\_ky\_thuat.SET\_REQUIRED(TRUE)

    UI.du\_thoi\_gian.SET\_REQUIRED(TRUE)

    // Vô hiệu hóa và xóa dữ liệu trường lạm dụng găng tay \[1, 3\]

    UI.co\_deo\_gang\_tay.DISABLE()

    co\_hoi\_vst.co\_deo\_gang\_tay \= NULL

END IF

RETURN co\_hoi\_vst

ENDFUNCTION

 \--------------- 

\#\#\# Cấu Trúc Dữ Liệu Giám Sát Kiểm Soát Nhiễm Khuẩn

{ "$schema": "http://json-schema.org/draft-07/schema\#", "title": "Compliance\_Monitoring\_Header\_Schema", "description": "Cấu trúc dữ liệu phần hành chính (Header) của phiếu giám sát tuân thủ kiểm soát nhiễm khuẩn theo BRD \[1, 2\]", "type": "object", "properties": { "id\_nguoi\_giam\_sat": { "type": "string", "description": "Mã định danh của người chấm / giám sát viên \[1, 2\]" }, "thoi\_gian\_giam\_sat": { "type": "string", "format": "date-time", "description": "Thời gian ghi nhận giám sát theo định dạng chuẩn ISO 8601 \[2\]" }, "id\_khoa\_phong": { "type": "string", "description": "Mã định danh của Khoa được giám sát \[1, 2\]" }, "id\_khu\_vuc": { "type": "string", "description": "Mã định danh của Khu vực chi tiết (Buồng bệnh/Phòng mổ) thuộc Khoa giám sát \[1, 2\]" }, "nhom\_doi\_tuong": { "type": "string", "enum": \[ "BS", "DD", "KTV", "HV", "NVVS", "KHAC" \], "description": "Nhóm phân loại đối tượng bị giám sát (Bác sĩ, Điều dưỡng, v.v.) \[1, 2\]" }, "id\_doi\_tuong\_giam\_sat": { "type": "string", "description": "Mã định danh tên đích danh của người bị giám sát \[1, 2\]" } }, "required": \[ "id\_nguoi\_giam\_sat", "thoi\_gian\_giam\_sat", "id\_khoa\_phong", "id\_khu\_vuc", "nhom\_doi\_tuong", "id\_doi\_tuong\_giam\_sat" \], "additionalProperties": false }

 \--------------- 

\#\#\# Kiến trúc Giao diện In ấn Hành chính Bệnh viện 103

{ "$schema": "http://json-schema.org/draft-07/schema\#", "title": "A4\_Print\_Ready\_Architecture\_KSNK", "description": "Đặc tả cấu trúc CSS @media print và các thành phần in ấn hành chính Bệnh viện Quân y 103", "type": "object", "properties": { "media\_print\_css": { "type": "object", "properties": { "page\_settings": { "type": "object", "properties": { "size": { "type": "string", "const": "A4" }, "orientation": { "type": "string", "enum": \["portrait", "landscape"\] }, "css\_rule": { "type": "string", "const": "@page { size: A4; margin: 15mm 20mm; }" } } }, "visibility\_control": { "type": "object", "properties": { "hide\_elements": { "type": "array", "items": { "type": "string" }, "default": \[".sidebar", ".navbar", ".action-buttons", ".no-print"\] } } } } }, "fixed\_header\_components": { "type": "object", "properties": { "tieu\_de\_benh\_vien": { "type": "object", "properties": { "content": { "type": "string", "const": "BỘ QUỐC PHÒNG\\nBỆNH VIỆN QUÂN Y 103" }, "alignment": { "type": "string", "const": "left" }, "css\_rules": { "type": "string", "const": "font-weight: bold; text-align: center; text-transform: uppercase;" } } }, "quoc\_hieu": { "type": "object", "properties": { "content": { "type": "string", "const": "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\\nĐộc lập \- Tự do \- Hạnh phúc" }, "alignment": { "type": "string", "const": "right" }, "css\_rules": { "type": "string", "const": "font-weight: bold; text-align: center;" } } }, "layout\_css": { "type": "string", "const": "display: flex; justify-content: space-between; margin-bottom: 20px; page-break-after: avoid;" } } }, "ui\_algorithms": { "type": "object", "properties": { "chart\_compression\_logic": { "type": "object", "properties": { "target\_elements": { "type": "array", "items": { "type": "string" }, "default": \[".recharts-wrapper", "canvas", "svg", ".chart-container"\] }, "css\_rules": { "type": "object", "properties": { "max-height": { "type": "string", "const": "250px \!important" }, "width": { "type": "string", "const": "100% \!important" }, "object-fit": { "type": "string", "const": "contain" }, "page-break-inside": { "type": "string", "const": "avoid" } } }, "description": { "type": "string", "const": "Thuật toán tự động thu gọn (ép chiều cao) các biểu đồ thống kê để đảm bảo không bị tràn hoặc vỡ trang khi kết xuất ra A4." } } } } }, "dynamic\_input\_components": { "type": "object", "properties": { "executive\_review\_section": { "type": "object", "properties": { "access\_role": { "type": "array", "items": { "type": "string" }, "default": \["Lanh\_Dao\_Khoa\_KSNK", "Ban\_Giam\_Doc"\] }, "trigger\_event": { "type": "string", "const": "onBeforePrint" }, "fields": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "label": { "type": "string" }, "ui\_element": { "type": "string", "const": "textarea" } } }, "default": \[ { "id": "nhan\_xet\_danh\_gia", "label": "Nhận xét đánh giá", "ui\_element": "textarea" }, { "id": "kien\_nghi\_de\_xuat", "label": "Kiến nghị đề xuất", "ui\_element": "textarea" } \] }, "print\_behavior": { "type": "string", "const": "Trong DOM @media print, chuyển đổi border của textarea thành border: none, loại bỏ thanh scroll, tự động mở rộng height (height: auto) để hiển thị toàn bộ text tĩnh chuẩn bị trình ký." } } } } } }, "required": \[ "media\_print\_css", "fixed\_header\_components", "ui\_algorithms", "dynamic\_input\_components" \] }

 \--------------- 

\#\#\# Hệ thống Quản trị Dữ liệu và Kiểm định Thống kê Y tế

// \============================================================================ // COMPONENT 1: BẢNG ĐIỀU KHIỂN NHẬN THỨC NGỮ CẢNH (CONTEXT-AWARE DASHBOARD) // TÍCH HỢP: BỘ LỌC CHÉO ĐA CHIỀU (CROSS-FILTER) // \============================================================================

// Định nghĩa cấu trúc lưu trữ trạng thái bộ lọc (Filter State) STRUCT CrossFilterState: startDate: DateTime endDate: DateTime departmentId: String // Khoa/Phòng specificAreaId: String // Khu vực đặc thù (Buồng bệnh/Phòng mổ) targetSubjectRole: String // Đối tượng giám sát (Bác sĩ, Điều dưỡng...)

// Khởi tạo các biến toàn cục cho Dashboard STATE currentFilter \= INIT CrossFilterState(NULL) STATE currentContext \= GET\_ACTIVE\_CHECKLIST\_TYPE() // Lấy ngữ cảnh bảng kiểm hiện tại (VD: "HandHygiene") STATE dataset \= \[\]

// Lắng nghe sự kiện khi người dùng thay đổi bất kỳ tiêu chí lọc nào EVENT ON CrossFilter\_Changed(updatedParams): // Cập nhật trạng thái bộ lọc currentFilter.UPDATE(updatedParams)

// Gọi API để lấy dữ liệu thô thỏa mãn bộ lọc thời gian \&amp; không gian

raw\_data \= CALL API\_GET("/api/v1/dashboard/metrics", currentFilter)

// Logic lọc chéo đa chiều (Cross-filtering Logic)

// Hệ thống duyệt qua từng bản ghi và chỉ giữ lại dữ liệu giao thoa của tất cả các bộ lọc được kích hoạt

dataset \= FILTER raw\_data WHERE (

    (record.timestamp \&gt;= currentFilter.startDate AND record.timestamp \&lt;= currentFilter.endDate) AND

    (currentFilter.departmentId IS NULL OR record.department\_id \== currentFilter.departmentId) AND

    (currentFilter.specificAreaId IS NULL OR record.area\_id \== currentFilter.specificAreaId) AND

    (currentFilter.targetSubjectRole IS NULL OR record.subject\_role \== currentFilter.targetSubjectRole)

)

// Logic Nhận thức Ngữ cảnh (Context-aware Rendering)

// Dashboard tự động phân tích loại bảng kiểm đang được xem để kết xuất biểu đồ tương ứng

SWITCH currentContext:

    CASE "HandHygiene":

        // Nếu là Vệ sinh tay \-\&gt; Hiển thị Biểu đồ mạng nhện (Radar Chart) phân tích điểm mù 5 thời điểm

        chart\_ui \= RENDER\_RADAR\_CHART(dataset, metric="5\_Moments\_Compliance")

    CASE "WasteManagement":

        // Nếu là Rác thải \-\&gt; Hiển thị Biểu đồ cột (Bar Chart) phân tích phân loại lỗi vi phạm

        chart\_ui \= RENDER\_BAR\_CHART(dataset, metric="Violation\_Errors")

    CASE "HAI\_Surveillance":

        // Nếu là NKBV \-\&gt; Hiển thị Biểu đồ đường (Line Chart) theo dõi tỷ suất nhiễm khuẩn/1000 ngày thiết bị

        chart\_ui \= RENDER\_LINE\_CHART(dataset, metric="Infection\_Rate\_Trend")

END SWITCH

UPDATE\_UI(chart\_ui)

// \============================================================================ // COMPONENT 2: THUẬT TOÁN KIỂM ĐỊNH THỐNG KÊ Y HỌC (P-VALUE CALCULATOR) // MỤC ĐÍCH: So sánh tỷ lệ tuân thủ giữa 2 nhóm độc lập (Khoa A vs Khoa B) // \============================================================================

// Định nghĩa cấu trúc dữ liệu đầu vào của một nhóm STRUCT GroupComplianceData: groupName: String compliantCount: Integer // Số lần tuân thủ (Thành công) nonCompliantCount: Integer // Số lần vi phạm (Thất bại) totalOpportunities: Integer // Tổng số cơ hội quan sát

// Hàm lõi tính toán kiểm định thống kê FUNCTION Calculate\_Statistical\_Significance(groupA: GroupComplianceData, groupB: GroupComplianceData) \-\> JSON:

// Tính tổng các biên (Marginal Totals)

totalCompliant \= groupA.compliantCount \+ groupB.compliantCount

totalNonCompliant \= groupA.nonCompliantCount \+ groupB.nonCompliantCount

grandTotal \= totalCompliant \+ totalNonCompliant

// Tính tần số kỳ vọng (Expected Frequencies) cho từng ô trong bảng chéo 2x2

expected\_A\_Comp \= (groupA.totalOpportunities \* totalCompliant) / grandTotal

expected\_A\_NonComp \= (groupA.totalOpportunities \* totalNonCompliant) / grandTotal

expected\_B\_Comp \= (groupB.totalOpportunities \* totalCompliant) / grandTotal

expected\_B\_NonComp \= (groupB.totalOpportunities \* totalNonCompliant) / grandTotal

// Khởi tạo biến lưu kết quả

p\_value \= 0.0

test\_method\_used \= ""

// Lựa chọn thuật toán dựa trên Quy tắc Cochran (Cochran's rule)

IF (expected\_A\_Comp \&lt; 5 OR expected\_A\_NonComp \&lt; 5 OR expected\_B\_Comp \&lt; 5 OR expected\_B\_NonComp \&lt; 5\) THEN

    // Nếu bất kỳ tần số kỳ vọng nào \&lt; 5, bắt buộc dùng Fisher's Exact Test

    test\_method\_used \= "Fisher's Exact Test"

    p\_value \= RUN\_FISHERS\_EXACT\_TEST(

        groupA.compliantCount, groupA.nonCompliantCount,

        groupB.compliantCount, groupB.nonCompliantCount

    )

ELSE

    // Nếu tất cả tần số kỳ vọng \&gt;= 5, sử dụng Pearson's Chi-square Test

    test\_method\_used \= "Chi-square Test"

    // Công thức: X^2 \= Sum((O \- E)^2 / E)

    chi\_square\_statistic \= (

        POWER(groupA.compliantCount \- expected\_A\_Comp, 2\) / expected\_A\_Comp \+

        POWER(groupA.nonCompliantCount \- expected\_A\_NonComp, 2\) / expected\_A\_NonComp \+

        POWER(groupB.compliantCount \- expected\_B\_Comp, 2\) / expected\_B\_Comp \+

        POWER(groupB.nonCompliantCount \- expected\_B\_NonComp, 2\) / expected\_B\_NonComp

    )

    // Bậc tự do (Degrees of Freedom) cho bảng 2x2 luôn là 1: df \= (rows \- 1\) \* (columns \- 1\)

    p\_value \= CALCULATE\_P\_VALUE\_FROM\_CHI\_SQUARE\_DISTRIBUTION(chi\_square\_statistic, df=1)

END IF

// Đánh giá cờ ý nghĩa thống kê (Alpha level \= 0.05)

co\_y\_nghia\_thong\_ke \= FALSE

IF p\_value \&lt; 0.05 THEN

    co\_y\_nghia\_thong\_ke \= TRUE

END IF

// Đóng gói và trả về chuỗi JSON tiêu chuẩn

RETURN FORMAT\_JSON({

    "comparison": groupA.groupName \+ " vs " \+ groupB.groupName,

    "rate\_GroupA": (groupA.compliantCount / groupA.totalOpportunities),

    "rate\_GroupB": (groupB.compliantCount / groupB.totalOpportunities),

    "test\_applied": test\_method\_used,

    "p\_value": p\_value,

    "co\_y\_nghia\_thong\_ke": co\_y\_nghia\_thong\_ke

})

 \--------------- 

\#\#\# Cấu trúc và Dữ liệu Hộp Thả Xuống Thông Minh

// \============================================================================ // COMPONENT: SMART DROPDOWN (HỘP THẢ XUỐNG THÔNG MINH) // TÍCH HỢP: Trải nghiệm Tìm kiếm Toàn diện (Searchable Everywhere) \[1\] // \============================================================================

DEFINE COMPONENT SmartDropdown(dataSource, placeholderText, isCascading, allowFreeText): // Khởi tạo các biến trạng thái STATE isOpen \= FALSE STATE searchQuery \= "" STATE selectedItem \= NULL STATE filteredData \= dataSource

// CƠ CHẾ LỌC DỮ LIỆU THỜI GIAN THỰC (Real-time Filtering) \[1\]

EVENT ON SearchInput\_Changed(inputText):

    searchQuery \= inputText

    IF searchQuery IS EMPTY THEN

        filteredData \= dataSource

    ELSE

        // Lọc kết quả tức thì dựa trên từ khóa gõ vào \[1\]

        filteredData \= FILTER dataSource WHERE (

            item.name CONTAINS(searchQuery, IGNORE\_CASE) OR

            item.search\_tags CONTAINS(searchQuery, IGNORE\_CASE)

        )

    END IF

EVENT ON Dropdown\_Toggled():

    isOpen \= NOT isOpen

EVENT ON Item\_Selected(item):

    selectedItem \= item

    searchQuery \= item.name

    isOpen \= FALSE

    // Kích hoạt Lọc dữ liệu liên hoàn (Cascading Dropdown) \[1\]

    IF isCascading \== TRUE THEN

        EMIT Update\_Cascading\_Children(item.department\_id)

    END IF

EVENT ON FreeText\_Entered(text):

    // Xử lý đối tượng vãng lai (Sinh viên, Bác sĩ hội chẩn) \[1\], \[2\]

    IF allowFreeText \== TRUE THEN

        selectedItem \= CREATE\_NEW\_RECORD(id="GUEST\_OBJ", name=text)

        searchQuery \= text

        isOpen \= FALSE

        EMIT Update\_Selection(selectedItem)

    END IF

// MÔ TẢ CẤU TRÚC RENDER GIAO DIỆN (UI)

RENDER:

    CONTAINER DropdownWrapper:

        // Tích hợp thanh tìm kiếm văn bản trực tiếp bên trong hộp thả xuống \[1\], \[2\]

        INPUT\_TEXT (

            Value: searchQuery,

            Placeholder: placeholderText,

            OnChange: SearchInput\_Changed,

            OnClick: Dropdown\_Toggled,

            ClassName: "touch-first-input"

        )

        IF isOpen \== TRUE THEN

            LIST\_CONTAINER (ClassName: "scrollable-list hidden-scrollbar"):

                IF filteredData IS NOT EMPTY THEN

                    FOR EACH item IN filteredData:

                        LIST\_ITEM (

                            Text: item.name,

                            OnClick: Item\_Selected(item)

                        )

                    END FOR

                ELSE IF allowFreeText \== TRUE AND searchQuery IS NOT EMPTY THEN

                    BUTTON (

                        Text: "Nhập tay tự do: " \+ searchQuery,

                        OnClick: FreeText\_Entered(searchQuery)

                    ) // \[2\]

                ELSE

                    TEXT "Không tìm thấy kết quả"

                END IF

            END LIST\_CONTAINER

        END IF

{ "danh\_muc\_khoa\_phong": \[ { "department\_id": "KHOA\_A01", "department\_name": "Khoa Nội Tiêu hóa", "department\_type": "LÂM SÀNG", "search\_tags": \["A01", "noi tieu hoa", "tieu hoa"\], "linked\_areas": \[ { "area\_id": "A01\_B01", "area\_name": "Buồng bệnh 01" }, { "area\_id": "A01\_B02", "area\_name": "Buồng bệnh 02" } \], "linked\_employees": \[ { "employee\_id": "NV\_A01\_001", "employee\_name": "Dương Xuân Nhượng", "job\_title": "Bác sĩ", "search\_tags": \["duong xuan nhuong", "bs nhuong", "truong khoa"\] }, { "employee\_id": "NV\_A01\_002", "employee\_name": "Đinh Minh Chí", "job\_title": "Điều dưỡng", "search\_tags": \["dinh minh chi", "dd chi", "dieu duong truong"\] } \] }, { "department\_id": "KHOA\_B05", "department\_name": "Khoa Gây mê Hồi sức", "department\_type": "NGOẠI KHOA", "search\_tags": \["B05", "gay me", "hoi suc", "phong mo"\], "linked\_areas": \[ { "area\_id": "B05\_OR\_01", "area\_name": "Phòng mổ số 1" }, { "area\_id": "B05\_RECOVERY", "area\_name": "Khu Hồi tỉnh" } \], "linked\_employees": \[ { "employee\_id": "NV\_B05\_001", "employee\_name": "Trần Đắc Tiệp", "job\_title": "Bác sĩ", "search\_tags": \["tran dac tiep", "bs tiep", "gay me"\] } \] } \] }

 \--------------- 

\#\#\# Lược đồ Phân quyền Hệ thống Kiểm soát Nhiễm khuẩn 103

{ "$schema": "http://json-schema.org/draft-07/schema\#", "title": "RBAC\_KSNK\_BRD\_Schema", "description": "Lược đồ JSON định nghĩa cấu trúc phân quyền (RBAC) theo Bản đặc tả yêu cầu nghiệp vụ (BRD) của Bệnh viện Quân y 103.", "type": "object", "required": \[ "danh\_sach\_vai\_tro", "quyen\_han\_tuong\_ung" \], "properties": { "danh\_sach\_vai\_tro": { "type": "array", "description": "Danh sách các nhóm người dùng có tương tác với hệ thống", "items": { "type": "string", "enum": \[ "Admin\_He\_Thong", "Lanh\_Dao\_Khoa\_KSNK\_Ban\_Giam\_Doc", "Truong\_Pho\_Khoa\_Lam\_Sang", "Nhan\_Vien\_Giam\_Sat\_Mang\_Luoi", "Nhan\_Vien\_Y\_Te" \] } }, "quyen\_han\_tuong\_ung": { "type": "array", "description": "Các quyền hạn được gắn với từng vai trò", "items": { "type": "object", "required": \[ "vai\_tro", "quyen\_tao\_bieu\_mau", "quyen\_duyet\_bao\_cao", "quyen\_nhap\_lieu", "pham\_vi\_du\_lieu", "mo\_ta\_quyen\_chi\_tiet" \], "properties": { "vai\_tro": { "type": "string" }, "quyen\_tao\_bieu\_mau": { "type": "boolean" }, "quyen\_duyet\_bao\_cao": { "type": "boolean" }, "quyen\_nhap\_lieu": { "type": "boolean" }, "pham\_vi\_du\_lieu": { "type": "string", "enum": \[ "Toan\_Quyen\_CSDL", "Toan\_Benh\_Vien", "Gioi\_Han\_Khoa\_Truc\_Thuoc", "Chi\_Xem\_Ca\_Nhan", "Khong\_Truy\_Cap\_Dashboard" \] }, "mo\_ta\_quyen\_chi\_tiet": { "type": "array", "items": { "type": "string" } } } } } }, "default": { "danh\_sach\_vai\_tro": \[ "Admin\_He\_Thong", "Lanh\_Dao\_Khoa\_KSNK\_Ban\_Giam\_Doc", "Truong\_Pho\_Khoa\_Lam\_Sang", "Nhan\_Vien\_Giam\_Sat\_Mang\_Luoi", "Nhan\_Vien\_Y\_Te" \], "quyen\_han\_tuong\_ung": \[ { "vai\_tro": "Admin\_He\_Thong", "quyen\_tao\_bieu\_mau": false, "quyen\_duyet\_bao\_cao": false, "quyen\_nhap\_lieu": false, "pham\_vi\_du\_lieu": "Toan\_Quyen\_CSDL", "mo\_ta\_quyen\_chi\_tiet": \[ "Toàn quyền can thiệp CSDL", "Backup/Restore hệ thống" \] }, { "vai\_tro": "Lanh\_Dao\_Khoa\_KSNK\_Ban\_Giam\_Doc", "quyen\_tao\_bieu\_mau": true, "quyen\_duyet\_bao\_cao": true, "quyen\_nhap\_lieu": false, "pham\_vi\_du\_lieu": "Toan\_Benh\_Vien", "mo\_ta\_quyen\_chi\_tiet": \[ "Xem báo cáo tổng thể, biểu đồ toàn viện", "Xếp hạng thi đua toàn Bệnh viện", "Đánh giá chéo tất cả các khoa", "Ký duyệt báo cáo thống kê", "Duyệt ca bệnh NKBV (HAI)" \] }, { "vai\_tro": "Truong\_Pho\_Khoa\_Lam\_Sang", "quyen\_tao\_bieu\_mau": false, "quyen\_duyet\_bao\_cao": false, "quyen\_nhap\_lieu": false, "pham\_vi\_du\_lieu": "Gioi\_Han\_Khoa\_Truc\_Thuoc", "mo\_ta\_quyen\_chi\_tiet": \[ "Chỉ có quyền xem số liệu, ca NKBV giới hạn trong phạm vi khoa của mình", "Xem tỷ lệ tuân thủ và lỗi vi phạm của khoa trực thuộc", "Không được sửa dữ liệu" \] }, { "vai\_tro": "Nhan\_Vien\_Giam\_Sat\_Mang\_Luoi", "quyen\_tao\_bieu\_mau": false, "quyen\_duyet\_bao\_cao": false, "quyen\_nhap\_lieu": true, "pham\_vi\_du\_lieu": "Khong\_Truy\_Cap\_Dashboard", "mo\_ta\_quyen\_chi\_tiet": \[ "Được quyền nhập liệu, thực hiện đánh giá các bảng kiểm", "Tạo ca bệnh NKBV (HAI)", "Báo cáo tai nạn nghề nghiệp", "Không có quyền truy cập bảng điều khiển thống kê tổng" \] }, { "vai\_tro": "Nhan\_Vien\_Y\_Te", "quyen\_tao\_bieu\_mau": false, "quyen\_duyet\_bao\_cao": false, "quyen\_nhap\_lieu": false, "pham\_vi\_du\_lieu": "Chi\_Xem\_Ca\_Nhan", "mo\_ta\_quyen\_chi\_tiet": \[ "Truy cập để xem điểm tuân thủ cá nhân", "Đọc các cảnh báo sai sót hệ thống đẩy vùng" \] } \] } }

 \--------------- 

\#\#\# Kiến Trúc Luồng Dữ Liệu Offline-First Giám Sát Nhiễm Khuẩn

// \============================================================================ // KIẾN TRÚC LUỒNG DỮ LIỆU: OFFLINE-FIRST PWA & TOUCH-FIRST UI // DỰ ÁN: HỆ THỐNG GIÁM SÁT KIỂM SOÁT NHIỄM KHUẨN \- BỆNH VIỆN QUÂN Y 103 // \============================================================================

// \---------------------------------------------------------------------------- // MODULE 1: CƠ CHẾ TẢI TRƯỚC (PRE-FETCH) VÀ BỘ NHỚ ĐỆM (CACHE TỪ SERVICE WORKER) // \---------------------------------------------------------------------------- FUNCTION RegisterServiceWorker(): IF "serviceWorker" IN navigator THEN navigator.serviceWorker.register("/sw.js")

   ON EVENT 'install' AS event:

        // Tải trước (Pre-fetch) Giao diện UI và file tĩnh vào Cache

        event.waitUntil(

            OpenCache("ksnk-ui-v1").THEN(cache \=\&gt;

                cache.addAll(\[

                    "/",

                    "/styles/touch-first-mobile.css", // Giao diện tối ưu chạm 1 tay

                    "/scripts/app-router.js",

                    "/assets/icons/"

                \])

            )

        )

    ON EVENT 'activate' AS event:

        // Tải trước (Pre-fetch) Bộ câu hỏi, Bảng kiểm, Danh mục từ CSDL

        FetchAndCacheQuestionnaires()

END IF

FUNCTION FetchAndCacheQuestionnaires(): TRY api\_response \= CALL HTTP\_GET("/api/v1/surveillance/checklists\_and\_schemas") IF api\_response.status \== 200 THEN OpenCache("ksnk-data-v1").THEN(cache \=\> cache.put("/api/v1/surveillance/checklists\_and\_schemas", api\_response) ) END IF CATCH NetworkError: LOG "Hệ thống đang ngoại tuyến. Tải cấu trúc bảng kiểm từ Cache." END TRY

// \---------------------------------------------------------------------------- // MODULE 2: GIAO DIỆN TOUCH-FIRST & LƯU TRỮ CỤC BỘ (INDEXEDDB) // \---------------------------------------------------------------------------- FUNCTION InitializeIndexedDB(): db \= OpenDatabase("KSNK\_OfflineDB", version=1) IF db\_needs\_upgrade THEN // Tạo bảng lưu trữ tạm thời cho các phiếu giám sát chưa được đồng bộ db.createObjectStore("PendingSurveys", keyPath="session\_id", autoIncrement=TRUE) END IF RETURN db

EVENT ON UserTouchInput (touch\_event, input\_data): // Kích hoạt thiết kế Touch-first: Ghi nhận sự kiện chạm/vuốt trên màn hình current\_form\_state \= UpdateLocalState(touch\_event.target, input\_data)

// Lưu tạm trạng thái (Local State) vào IndexedDB qua MỖI THAO TÁC CHẠM

// nhằm đảm bảo tuyệt đối không mất dữ liệu tại vùng lõm sóng (Wifi dead zones)

db \= InitializeIndexedDB()

transaction \= db.transaction(\["PendingSurveys"\], "readwrite")

store \= transaction.objectStore("PendingSurveys")

survey\_record \= {

    "session\_id": current\_form\_state.session\_id,

    "nguoi\_giam\_sat\_id": GetJWTAuthTokenID(),

    "khoa\_id": current\_form\_state.khoa\_id,

    "thoi\_gian\_tao": GetCurrentISO8601Time(),

    "du\_lieu\_danh\_gia": current\_form\_state.answers, // Dữ liệu câu hỏi Đạt/Không đạt

    "trang\_thai": "PENDING\_SYNC"

}

store.put(survey\_record)

FUNCTION SubmitSurveillanceForm(survey\_record): IF IsNetworkOnline() \== TRUE THEN TRY response \= CALL HTTP\_POST("/api/v1/surveillance/submit", survey\_record) IF response.status \== 200 THEN RemoveFromIndexedDB(survey\_record.session\_id) SHOW\_UI\_TOAST("Lưu máy chủ thành công") END IF CATCH Error: SHOW\_OFFLINE\_WARNING("Lỗi kết nối máy chủ Supabase. Đã lưu vào IndexedDB.") END TRY ELSE SHOW\_OFFLINE\_WARNING("Đang ngoại tuyến. Dữ liệu đã lưu an toàn vào IndexedDB. Sẽ đồng bộ khi có mạng.") END IF

// \---------------------------------------------------------------------------- // MODULE 3: ĐỒNG BỘ HÓA TỰ ĐỘNG (AUTO-SYNC) KHI CÓ KẾT NỐI MẠNG TRỞ LẠI // \---------------------------------------------------------------------------- // Lắng nghe sự kiện hệ thống điều hành hoặc trình duyệt phát hiện có Internet EVENT ON NetworkStatusChanged (status): IF status \== 'online' THEN TriggerAutoSyncProcess() END IF

FUNCTION TriggerAutoSyncProcess(): db \= InitializeIndexedDB() transaction \= db.transaction(\["PendingSurveys"\], "readonly") store \= transaction.objectStore("PendingSurveys")

// Lấy toàn bộ phiếu giám sát đang kẹt ở trạng thái PENDING\_SYNC

pending\_records \= store.getAll()

IF pending\_records.length \&gt; 0 THEN

    SHOW\_SYNC\_INDICATOR("Đang đồng bộ dữ liệu ngoại tuyến về Căn cứ...")

    FOR EACH record IN pending\_records:

        TRY

            // Đẩy dữ liệu từ thiết bị cục bộ lên Trạm Xử Lý SQL (Supabase Backend)

            api\_response \= CALL HTTP\_POST("/api/v1/surveillance/submit", record)

            IF api\_response.status \== 200 OR api\_response.status \== 201 THEN

                // Xóa bản ghi khỏi IndexedDB cục bộ sau khi đồng bộ thành công

                delete\_transaction \= db.transaction(\["PendingSurveys"\], "readwrite")

                delete\_store \= delete\_transaction.objectStore("PendingSurveys")

                delete\_store.delete(record.session\_id)

            END IF

        CATCH SyncError:

            LOG "Lỗi đồng bộ bản ghi ID: " \+ record.session\_id \+ ". Bỏ qua và thử lại ở chu kỳ Sync kế tiếp."

            CONTINUE

        END TRY

    END FOR

    HIDE\_SYNC\_INDICATOR()

END IF

 \--------------- 

\#\#\# Cấu trúc JSON Danh mục Nhân sự và Khoa phòng Tối ưu

{ "$schema": "http://json-schema.org/draft-07/schema\#", "title": "Optimized\_Master\_Catalog\_Payload", "description": "Cấu trúc Payload JSON tối ưu phục vụ bộ lọc liên hoàn (Cascading Dropdown) và tìm kiếm toàn diện (Searchable Everywhere) tại Client-side, đảm bảo không cần gọi lại API từ máy chủ.", "type": "object", "properties": { "departments": { "type": "array", "description": "Mảng danh sách toàn bộ Khoa/Phòng trong hệ thống.", "items": { "$ref": "\#/definitions/Department" } } }, "required": \[ "departments" \], "definitions": { "Department": { "type": "object", "properties": { "department\_id": { "type": "string", "format": "uuid", "description": "Khóa chính định danh Khoa/Phòng." }, "department\_code": { "type": "string", "description": "Mã Khoa/Phòng (VD: C18, B05, A01)." }, "department\_name": { "type": "string", "description": "Tên đầy đủ của Khoa/Phòng." }, "block": { "type": "string", "enum": \[ "NỘI", "NGOẠI", "CẬN LÂM SÀNG", "HÀNH CHÍNH" \], "description": "Khối trực thuộc." }, "areas": { "type": "array", "description": "Danh sách các khu vực (buồng bệnh, phòng mổ, phòng thủ thuật) lồng ghép trực tiếp thuộc Khoa/Phòng này.", "items": { "$ref": "\#/definitions/Area" } }, "staffs": { "type": "array", "description": "Danh sách nhân viên lồng ghép trực tiếp thuộc Khoa/Phòng này, tối ưu hóa cho Smart Dropdown.", "items": { "$ref": "\#/definitions/Staff" } } }, "required": \[ "department\_id", "department\_code", "department\_name", "areas", "staffs" \] }, "Area": { "type": "object", "properties": { "area\_id": { "type": "string", "format": "uuid" }, "area\_name": { "type": "string", "description": "Tên khu vực cụ thể." }, "area\_type": { "type": "string", "description": "Phân loại khu vực để đánh giá rủi ro nhiễm khuẩn." } }, "required": \[ "area\_id", "area\_name" \] }, "Staff": { "type": "object", "properties": { "staff\_id": { "type": "string", "format": "uuid" }, "employee\_code": { "type": "string", "description": "Mã nhân viên định danh trên hệ thống (VD: C18/001)." }, "full\_name": { "type": "string", "description": "Họ và tên nhân viên." }, "job\_title": { "type": "string", "description": "Nghề nghiệp chuyên môn (VD: BÁC SĨ, ĐIỀU DƯỠNG, KỸ THUẬT VIÊN)." }, "role": { "type": "string", "description": "Vai trò/Chức vụ hành chính (VD: CHỈ HUY, ĐIỀU DƯỠNG TRƯỞNG, NHÂN VIÊN)." }, "search\_index": { "type": "string", "description": "Chuỗi văn bản gộp (Flattened string) chứa tên không dấu, mã NV, chức danh để thuật toán Client-side tìm kiếm tức thì O(1)." } }, "required": \[ "staff\_id", "full\_name", "job\_title", "search\_index" \] } }, "example\_payload": { "departments": \[ { "department\_id": "1a2b3c4d-c180-4abc-8def-123456789018", "department\_code": "C18", "department\_name": "KHOA KIỂM SOÁT NHIỄM KHUẨN", "block": "CẬN LÂM SÀNG", "areas": \[ { "area\_id": "area-c18-01", "area\_name": "Đơn vị Tiệt khuẩn trung tâm (CSSD)", "area\_type": "Khu sạch" }, { "area\_id": "area-c18-02", "area\_name": "Đơn vị Giặt là", "area\_type": "Khu bẩn" } \], "staffs": \[ { "staff\_id": "staff-c18-001", "employee\_code": "C18/001", "full\_name": "TRỊNH HỮU NGHĨA", "job\_title": "BÁC SĨ", "role": "CHỈ HUY", "search\_index": "trinh huu nghia bac si chi huy c18/001" }, { "staff\_id": "staff-c18-002", "employee\_code": "C18/002", "full\_name": "NGUYỄN ĐĂNG LỢI", "job\_title": "ĐIỀU DƯỠNG", "role": "HÀNH CHÍNH TRƯỞNG", "search\_index": "nguyen dang loi dieu duong hanh chinh truong c18/002" }, { "staff\_id": "staff-c18-004", "employee\_code": "C18/004", "full\_name": "LÊ THỊ THUỲ DƯƠNG", "job\_title": "ĐIỀU DƯỠNG", "role": "NHÂN VIÊN", "search\_index": "le thi thuy duong dieu duong nhan vien gs-cssd c18/004" } \] }, { "department\_id": "2b3c4d5e-b050-4bcd-8ef0-234567890123", "department\_code": "B05", "department\_name": "KHOA GÂY MÊ HỒI SỨC", "block": "NGOẠI", "areas": \[ { "area\_id": "area-b05-01", "area\_name": "Phòng mổ số 1", "area\_type": "Vùng 3: Hạn chế (Vô khuẩn)" }, { "area\_id": "area-b05-02", "area\_name": "Khu hồi tỉnh", "area\_type": "Vùng 2: Bán hạn chế" } \], "staffs": \[ { "staff\_id": "staff-b05-001", "employee\_code": "B05/001", "full\_name": "TRẦN ĐẮC TIỆP", "job\_title": "BÁC SĨ", "role": "CHỦ NHIỆM KHOA", "search\_index": "tran dac tiep bac si chu nhiem khoa b05/001" }, { "staff\_id": "staff-b05-002", "employee\_code": "B05/002", "full\_name": "ĐỖ VĂN PHONG", "job\_title": "ĐIỀU DƯỠNG", "role": "ĐIỀU DƯỠNG TRƯỞNG", "search\_index": "do van phong dieu duong truong b05/002" } \] }, { "department\_id": "3c4d5e6f-a010-4cde-8f01-345678901234", "department\_code": "A01", "department\_name": "KHOA NỘI TIÊU HÓA", "block": "NỘI", "areas": \[ { "area\_id": "area-a01-01", "area\_name": "Buồng bệnh 201", "area\_type": "Phòng bệnh nội trú" }, { "area\_id": "area-a01-02", "area\_name": "Phòng Nội soi Tiêu hóa", "area\_type": "Phòng thủ thuật" } \], "staffs": \[ { "staff\_id": "staff-a01-001", "employee\_code": "A01/001", "full\_name": "DƯƠNG XUÂN NHƯƠNG", "job\_title": "BÁC SĨ", "role": "CHỦ NHIỆM KHOA", "search\_index": "duong xuan nhuong bac si chu nhiem khoa a01/001" }, { "staff\_id": "staff-a01-002", "employee\_code": "A01/002", "full\_name": "ĐINH MINH CHÍ", "job\_title": "ĐIỀU DƯỠNG", "role": "ĐIỀU DƯỠNG TRƯỞNG", "search\_index": "dinh minh chi dieu duong truong a01/002" } \] } \] } }

 \--------------- 

\#\#\# Cơ Chế Đồng Bộ Dữ Liệu Ngoại Tuyến PWA

// MODULE: PWA OFFLINE-FIRST SYNCHRONIZATION ENGINE // ROLE: SOLUTION ARCHITECT & DATA MODELER

// 1\. QUÁ TRÌNH TẢI DỮ LIỆU DANH MỤC VÀO CƠ SỞ DỮ LIỆU CỤC BỘ (KHI CÓ MẠNG) \[1, 2\] FUNCTION SyncCatalogsToLocal(): IF (Network.IsOnline() \== TRUE) THEN TRY: // Khởi tạo tiến trình kéo dữ liệu từ máy chủ (Server API) DATA departments \= AWAIT API.GET('/api/v1/departments') DATA employees \= AWAIT API.GET('/api/v1/employees') DATA checklists \= AWAIT API.GET('/api/v1/checklist\_templates')

       // Xóa dữ liệu cũ và nạp dữ liệu danh mục mới vào IndexedDB trình duyệt

        AWAIT IndexedDB.Table('local\_departments').ClearAndInsert(departments)

        AWAIT IndexedDB.Table('local\_employees').ClearAndInsert(employees)

        AWAIT IndexedDB.Table('local\_checklists').ClearAndInsert(checklists)

        RETURN "Tải danh mục ngoại tuyến thành công"

    CATCH Error e:

        Log.Error("Lỗi đồng bộ danh mục: " \+ e.Message)

        RETURN ERROR

END IF

END FUNCTION

// 2\. QUÁ TRÌNH NHÂN VIÊN Y TẾ ĐIỀN BIỂU MẪU VÀ LƯU TẠM (KHI MẤT MẠNG) \[1, 3\] FUNCTION SaveFormLocal(formData): // Sinh mã định danh cục bộ (UUID) cho bản ghi giám sát DATA recordId \= GenerateUUID()

// Cấu trúc gói dữ liệu lưu trữ

DATA surveillanceRecord \= {

    id: recordId,

    payload: formData,

    created\_at: CurrentTimestamp(),

    offline\_sync\_status: "PENDING" // Trạng thái chờ đồng bộ

}

TRY:

    // Lưu trữ trạng thái biểu mẫu vào IndexedDB qua mỗi thao tác chạm

    AWAIT IndexedDB.Table('local\_surveillance\_records').Insert(surveillanceRecord)

    IF (Network.IsOnline() \== TRUE) THEN

        // Tự động kích hoạt luồng đẩy dữ liệu nếu mạng đang ổn định

        Trigger BackgroundWorker(AutoSyncToServer)

    ELSE

        RETURN "Đã lưu dữ liệu vào Local State. Đợi Wifi phục hồi để đồng bộ."

    END IF

CATCH Error e:

    Log.Error("Lỗi ghi dữ liệu IndexedDB: " \+ e.Message)

    RETURN ERROR

END FUNCTION

// 3\. QUÁ TRÌNH LẮNG NGHE SỰ KIỆN VÀ TỰ ĐỘNG ĐẨY (PUSH) DỮ LIỆU LÊN MÁY CHỦ \[1, 2\] // Tích hợp bộ lắng nghe sự kiện của hệ điều hành/trình duyệt EVENT\_LISTENER Window.On('online', AutoSyncToServer)

FUNCTION AutoSyncToServer(): // Trích xuất các bản ghi tồn đọng chưa được đồng bộ từ IndexedDB DATA pendingRecords \= AWAIT IndexedDB.Table('local\_surveillance\_records') .Find(offline\_sync\_status \== "PENDING")

IF (pendingRecords.Length \== 0\) THEN

    RETURN "Không có dữ liệu chờ đồng bộ"

END IF

FOR EACH record IN pendingRecords:

    TRY:

        // Đẩy tải trọng dữ liệu (Payload) lên máy chủ

        DATA response \= AWAIT API.POST('/api/v1/surveillance/submit', record.payload)

        // Xử lý phản hồi từ máy chủ

        IF (response.StatusCode \== 200 OR response.StatusCode \== 201\) THEN

            // Đồng bộ thành công: Cập nhật cờ trạng thái tại IndexedDB

            AWAIT IndexedDB.Table('local\_surveillance\_records')

                           .Update(record.id, { offline\_sync\_status: "SYNCED" })

        ELSE

            // Xử lý lỗi trả về (VD: Sai cấu trúc JSON Schema, lỗi xác thực)

            Log.Error("Lỗi từ máy chủ: " \+ response.ErrorMessage)

            AWAIT IndexedDB.Table('local\_surveillance\_records')

                           .Update(record.id, {

                               offline\_sync\_status: "ERROR",

                               error\_detail: response.ErrorMessage

                           })

        END IF

    CATCH NetworkError e:

        // Xử lý gián đoạn mạng đột ngột trong quá trình truyền tải

        Log.Warning("Mất kết nối khi đang Push: " \+ e.Message)

        BREAK // Tạm dừng vòng lặp, chờ tín hiệu 'online' tiếp theo

    END TRY

END FOR

RETURN "Tiến trình đồng bộ ngoại tuyến hoàn tất"

END FUNCTION

 \--------------- 

\#\#\# Lược Đồ Cơ Sở Dữ Liệu Kiểm Soát Nhiễm Khuẩn

{ "$schema": "http://json-schema.org/draft-07/schema\#", "title": "Core\_Database\_Entity\_Relationship\_Schema", "description": "Lược đồ cơ sở dữ liệu quan hệ cho hệ thống Kiểm soát nhiễm khuẩn (KSNK) \[1, 2\].", "type": "object", "tables": { "KhoaPhong": { "table\_name": "departments", "description": "Thực thể lưu trữ danh mục Khoa/Phòng \[3\].", "columns": { "department\_id": { "type": "UUID", "constraints": \["PRIMARY KEY"\] }, "department\_code": { "type": "VARCHAR", "constraints": \["UNIQUE", "NOT NULL"\] }, "department\_name": { "type": "VARCHAR", "constraints": \["NOT NULL"\] }, "block": { "type": "VARCHAR", "description": "Khối nội, ngoại, cận lâm sàng \[4\]." }, "created\_at": { "type": "TIMESTAMP", "constraints": \["DEFAULT CURRENT\_TIMESTAMP"\] } } }, "NhanVien": { "table\_name": "employees", "description": "Thực thể lưu trữ hồ sơ nhân sự và phân quyền \[3, 5\].", "columns": { "employee\_id": { "type": "UUID", "constraints": \["PRIMARY KEY"\] }, "department\_id": { "type": "UUID", "constraints": \["FOREIGN KEY REFERENCES KhoaPhong(department\_id)"\], "description": "Trường khóa ngoại liên kết nhân viên với khoa trực thuộc \[1\]." }, "full\_name": { "type": "VARCHAR", "constraints": \["NOT NULL"\] }, "job\_title": { "type": "VARCHAR", "description": "Chức danh nghiệp vụ như Bác sĩ, Điều dưỡng \[6\]." }, "rbac\_role": { "type": "VARCHAR", "description": "Phân quyền hệ thống: Admin, Lãnh đạo, Trưởng khoa, Nhân viên \[5\]." }, "dynamic\_profile": { "type": "JSONB", "description": "Cấu trúc Dynamic HR Schema tự động nhận diện và dung nạp các trường thông tin mới (trình độ, CCHN) mà không can thiệp CSDL \[5\]." }, "created\_at": { "type": "TIMESTAMP", "constraints": \["DEFAULT CURRENT\_TIMESTAMP"\] } } }, "DanhMucBangKiem": { "table\_name": "checklist\_templates", "description": "Thực thể lưu trữ cấu trúc động của các biểu mẫu \[5\].", "columns": { "template\_id": { "type": "UUID", "constraints": \["PRIMARY KEY"\] }, "template\_name": { "type": "VARCHAR", "constraints": \["NOT NULL"\] }, "template\_type": { "type": "VARCHAR", "description": "Phân loại biểu mẫu: Rác thải, Đồ vải, PPE, Bundle, Vệ sinh tay \[7, 8\]." }, "criteria\_schema": { "type": "JSONB", "description": "Cấu trúc tiêu chí gồm: id\_cau\_hoi, noi\_dung, loai\_thang\_do (Dat\_KhongDat, ThangDiem\_1\_5) và la\_loai\_trong\_yeu (Boolean) kích hoạt tiến trình nền cảnh báo đỏ \[7, 9\]." }, "is\_active": { "type": "BOOLEAN", "constraints": \["DEFAULT TRUE"\] } } }, "KetQuaGiamSat": { "table\_name": "surveillance\_records", "description": "Thực thể lưu vết dữ liệu giám sát thực tế từ ứng dụng ngoại tuyến \[1, 10\].", "columns": { "record\_id": { "type": "UUID", "constraints": \["PRIMARY KEY"\] }, "template\_id": { "type": "UUID", "constraints": \["FOREIGN KEY REFERENCES DanhMucBangKiem(template\_id)"\] }, "evaluator\_id": { "type": "UUID", "constraints": \["FOREIGN KEY REFERENCES NhanVien(employee\_id)"\], "description": "Tên người chấm đánh giá (Lưu vết bắt buộc) \[7\]." }, "evaluated\_department\_id": { "type": "UUID", "constraints": \["FOREIGN KEY REFERENCES KhoaPhong(department\_id)"\], "description": "Khoa được giám sát, hỗ trợ chức năng lọc dữ liệu liên hoàn (Cascading Dropdown) \[1, 7\]." }, "evaluated\_subject\_id": { "type": "UUID", "constraints": \["NULL", "FOREIGN KEY REFERENCES NhanVien(employee\_id)"\], "description": "Tên đích danh người bị giám sát \[7\]." }, "free\_text\_subject": { "type": "VARCHAR", "constraints": \["NULL"\], "description": "Nhập liệu tự do (Free-text) cho đối tượng vãng lai không có trong danh bạ \[1\]." }, "location\_detail": { "type": "VARCHAR", "description": "Khu vực chi tiết: Buồng bệnh, Phòng mổ \[7\]." }, "evaluation\_time": { "type": "TIMESTAMP", "description": "Thời gian lưu vết \[7\]." }, "offline\_sync\_status": { "type": "BOOLEAN", "description": "Trạng thái đồng bộ của Local State/IndexedDB sau khi mạng phục hồi \[1, 11\]." }, "results\_data": { "type": "JSONB", "description": "Dữ liệu đánh giá trải ngang (Data Flattening) lưu trữ dưới dạng nhị phân 1/0 phục vụ kết xuất SPSS/Stata \[10\]." } } }, "CaBenhNhiemKhuan": { "table\_name": "hai\_cases", "description": "Thực thể lưu trữ thông tin bệnh án, thông số lâm sàng giám sát HAI theo tiêu chuẩn CDC \[12\].", "columns": { "case\_id": { "type": "UUID", "constraints": \["PRIMARY KEY"\] }, "patient\_id": { "type": "VARCHAR", "constraints": \["NOT NULL"\] }, "attribution\_department\_id": { "type": "UUID", "constraints": \["FOREIGN KEY REFERENCES KhoaPhong(department\_id)"\], "description": "Gán trách nhiệm cho khoa theo Luật luân chuyển khoa (Transfer Rule) \[12\]." }, "admission\_date": { "type": "TIMESTAMP", "description": "Luật Ngày nhập viện (Day 1\) \[12\]." }, "date\_of\_event": { "type": "TIMESTAMP", "description": "Ngày xảy ra sự kiện nhiễm khuẩn (DOE) \[12\]." }, "hai\_type": { "type": "VARCHAR", "description": "Phân loại NKBV: VAE, PNEU, SSI, BSI, UTI \[13-15\]." }, "is\_poa": { "type": "BOOLEAN", "description": "Cờ Luật Hiện diện lúc nhập viện (POA) phát hiện triệu chứng vào Ngày 1 hoặc 2 \[12\]." }, "iwp\_timeframe": { "type": "TSTZRANGE", "description": "Luật Cửa sổ Nhiễm khuẩn 7 ngày (IWP) gom triệu chứng rời rạc \[12\]." }, "rit\_timeframe": { "type": "TSTZRANGE", "description": "Luật Khóa trùng lặp 14 ngày (RIT) chặn báo động lặp lại \[12\]." }, "sbap\_timeframe": { "type": "TSTZRANGE", "description": "Luật Nhiễm khuẩn huyết thứ phát 14-17 ngày (SBAP) \[12\]." }, "clinical\_parameters": { "type": "JSONB", "description": "Lưu trữ PEEP, FiO2, Bạch cầu, Nhiệt độ phục vụ Sơ đồ Cây Quyết định (Decision Trees) chẩn đoán tự động \[13\]." }, "microbiology\_results": { "type": "JSONB", "description": "Định lượng sinh học, từ điển vi sinh và vi khuẩn cộng sinh \[14, 15\]." }, "invasive\_devices": { "type": "JSONB", "description": "Lưu trữ số ngày thiết bị xâm lấn (≥ 2 ngày dương lịch cho Máy thở, CVC, Sonde tiểu) \[12\]." }, "approval\_status": { "type": "VARCHAR", "description": "Trạng thái duyệt ca bệnh của Khoa KSNK chuyên trách \[5\]." } } } }, "relationships": \[ { "foreign\_key": "NhanVien.department\_id", "references": "KhoaPhong.department\_id", "relation\_type": "Many-to-One" }, { "foreign\_key": "KetQuaGiamSat.template\_id", "references": "DanhMucBangKiem.template\_id", "relation\_type": "Many-to-One" }, { "foreign\_key": "KetQuaGiamSat.evaluator\_id", "references": "NhanVien.employee\_id", "relation\_type": "Many-to-One" }, { "foreign\_key": "KetQuaGiamSat.evaluated\_department\_id", "references": "KhoaPhong.department\_id", "relation\_type": "Many-to-One" }, { "foreign\_key": "KetQuaGiamSat.evaluated\_subject\_id", "references": "NhanVien.employee\_id", "relation\_type": "Many-to-One" }, { "foreign\_key": "CaBenhNhiemKhuan.attribution\_department\_id", "references": "KhoaPhong.department\_id", "relation\_type": "Many-to-One" } \] }

 \--------------- 

\#\#\# Kiến Trúc Hệ Thống Quản Lý Kiểm Soát Nhiễm Khuẩn

{ "MasterModuleArchitecture": { "CoreFoundation": { "description": "Khối nền tảng \[1\].", "features": \[ "Xác thực phân quyền đa tầng (RBAC \- Role Based Access Control) giới hạn quyền truy cập theo từng cấp bậc và phạm vi khoa phòng \[2\], \[3\].", "Luồn dữ liệu xác thực ẩn danh (Silent Auth Injection) và Tường lửa Middleware bảo vệ an toàn các tuyến truy cập \[4\], \[5\].", "Bảo mật cấp dòng (Row Level Security \- RLS) trên cơ sở dữ liệu Supabase đảm bảo tính toàn vẹn dữ liệu giữa các khoa \[6\], \[7\].", "Thiết kế ứng dụng đa nền tảng ngoại tuyến (Offline-First / PWA) đảm bảo hoạt động liên tục tại các điểm mù mạng \[8\], \[9\], \[10\].", "Lưu trữ cục bộ (Local State/IndexedDB) và tự động đồng bộ (Auto-sync) tải dữ liệu lên máy chủ khi kết nối mạng phục hồi \[8\], \[11\], \[10\].", "Kiến trúc Master-Instance phân tách khuôn mẫu lý thuyết và thực thể vật lý trong quản lý định danh \[12\]." \] }, "UIComponents": { "description": "Khối giao diện \[1\].", "features": \[ "Hệ thống tìm kiếm toàn diện (Searchable Everywhere) tích hợp trực tiếp thanh tìm kiếm vào mọi hộp thả xuống \[8\], \[13\].", "Lọc dữ liệu liên hoàn (Cascading Dropdown) tự động cập nhật danh sách khu vực và nhân sự dựa trên khoa phòng đã chọn \[8\], \[13\].", "Nhập liệu đối tượng vãng lai linh hoạt bằng trường văn bản tự do (Free-text input) cho các nhân sự ngoài biên chế \[8\], \[13\].", "Biểu mẫu động (Dynamic Forms) khởi tạo tự động từ cấu trúc JSON Schema hoặc tệp Excel \[14\], \[15\].", "Giao diện đa mục tiêu (Multi-Observation Matrix) cho phép giám sát đồng thời tối đa 3 nhân viên y tế trên một màn hình \[16\], \[11\], \[17\].", "Khối nhập hành chính dùng chung (AdministrativeHeader) lưu vết dữ liệu và kế thừa logic in ấn tiêu chuẩn \[18\], \[19\], \[20\].", "Tối ưu hóa thao tác chạm (Touch-first) cho thiết bị di động bằng các khối nút bấm lớn, thiết kế phẳng và trang nhã \[8\], \[21\], \[17\], \[22\]." \] }, "BusinessModules": { "description": "Khối nghiệp vụ \[8\].", "modules": { "ComplianceSurveillance": { "name": "Giám sát tuân thủ (Giai đoạn 1\) \[18\].", "features": \[ "Giám sát Bảng kiểm thông thường hỗ trợ đa dạng thang đo cho rác thải, đồ vải, PPE và các gói Bundle \[18\], \[15\].", "Giám sát Vệ sinh tay theo chuẩn WHO ghi nhận đồng thời 5 thời điểm, hành động, kỹ thuật và thời gian \[16\], \[17\], \[23\].", "Luật chặn logic tự động phát hiện và cảnh báo tức thời tình trạng lạm dụng găng tay y tế thay cho vệ sinh tay \[16\], \[24\], \[25\].", "Hệ thống Cảnh báo Đỏ (Red Flag) tự động kích hoạt tiến trình nền gửi thông báo lỗi trọng yếu qua Webhook (Zalo/Telegram) \[18\], \[26\], \[27\]." \] }, "HAISurveillance": { "name": "Giám sát ca bệnh HAI (Giai đoạn 2\) \[28\].", "features": \[ "Thuật toán khóa và định vị thời gian cốt lõi với Ngày nhập viện, Cửa sổ IWP 7 ngày và Khung lặp lại RIT 14 ngày \[28\].", "Thuật toán tự động phân biệt và gán nhãn Hiện diện lúc nhập viện (POA) từ Ngày 1 hoặc Ngày 2 \[28\], \[29\].", "Luật luân chuyển khoa (Transfer Rule) tự động quy trách nhiệm nhiễm khuẩn cho khoa cũ trong khoảng thời gian quy định \[28\].", "Sơ đồ cây quyết định (Decision Trees) tự động chẩn đoán khách quan VAE (VAC, IVAC, PVAP) dựa trên dữ liệu PEEP/FiO2 \[30\].", "Đọc mã phẫu thuật để phân tầng độ sâu và đếm ngược thời gian 30 hoặc 90 ngày cho Nhiễm khuẩn vết mổ (SSI) \[31\].", "Tích hợp từ điển vi sinh nhận diện tự động cấu trúc chẩn đoán BSI/CLABSI và UTI/CAUTI theo chuẩn NHSN CDC \[32\]." \] }, "CSSDManagement": { "name": "Quản lý dụng cụ và Hậu cần (CSSD & Logistics) \[29\], \[33\].", "features": \[ "Luồng luân chuyển dụng cụ phẫu thuật định danh qua 6 chốt chặn vòng đời bằng mã QR Code \[34\], \[35\], \[29\].", "Giám sát chất lượng và tự động kích hoạt khóa an toàn đóng băng bộ dụng cụ khi phát hiện thiếu hoặc hỏng \[35\].", "Luồng luân chuyển dụng cụ thủ thuật và vật tư tái sử dụng quản lý hàng loạt theo lô và chứng từ điện tử \[36\].", "Quản lý vòng đời thiết bị, tự động cảnh báo bảo dưỡng và vô hiệu hóa máy tiệt khuẩn lỗi khỏi khâu vận hành \[37\], \[33\].", "Phân hệ hậu cần quản lý hóa chất KSNK và vật tư tiêu hao tuân thủ nguyên tắc FEFO, cảnh báo tự động ngưỡng tồn kho \[37\], \[33\]." \] } } }, "Analytics": { "description": "Khối báo cáo \[38\].", "features": \[ "Bảng điều khiển thông minh (Context-Aware Dashboard) tự động nhận diện bối cảnh và hiển thị biểu đồ tương ứng theo bảng kiểm \[38\], \[20\].", "Bộ lọc chéo đa chiều (Cross-filter) cho phép trích xuất dữ liệu tùy biến theo thời gian, khoa phòng, khu vực và nhóm đối tượng \[38\].", "Công cụ kiểm định thống kê y học tự động phân tích và tính toán P-Value, Chi-square, Fisher's Exact Test \[38\].", "Kết xuất dữ liệu nghiên cứu khoa học (SPSS/Stata Export) tự động trải ngang dữ liệu (Data Flattening) và chuyển đổi cột nhị phân \[38\].", "Cơ chế in ấn hành chính khổ A4 (A4 Print-ready) sử dụng CSS @media print để tự động loại bỏ giao diện dư thừa và kết xuất lưới dữ liệu \[38\], \[39\], \[40\].", "Khung điền văn bản (Textarea) trực tiếp trên phần mềm phục vụ nhập nhận xét và kiến nghị trước khi xuất báo cáo trình ký \[38\]." \] } } }

 \--------------- 

\#\#\# Cấu trúc Dữ liệu và Logic Bộ lọc Thông minh

{ "Danh\_Muc\_Khoa\_Phong": \[ { "department\_id": "A01", "department\_name": "KHOA NỘI TIÊU HÓA", "block\_type": "NỘI", "head\_of\_department": "DƯƠNG XUÂN NHƯƠNG", "head\_nurse": "ĐINH MINH CHÍ" }, { "department\_id": "B01", "department\_name": "KHOA CHẤN THƯƠNG CHỈNH HÌNH", "block\_type": "NGOẠI", "head\_of\_department": "NGUYỄN BÁ NGỌC", "head\_nurse": "NGUYỄN VĂN HẢI" }, { "department\_id": "C18", "department\_name": "KHOA KIỂM SOÁT NHIỄM KHUẨN", "block\_type": "CẬN LÂM SÀNG", "head\_of\_department": "PHẠM XUÂN QUANG", "head\_nurse": "NGUYỄN ĐĂNG LỢI" } \], "Danh\_Muc\_Nhan\_Vien": \[ { "employee\_id": "NV001", "full\_name": "TRỊNH HỮU NGHĨA", "department\_id": "C18", "job\_title": "BÁC SĨ", "role": "CHỈ HUY" }, { "employee\_id": "NV002", "full\_name": "ĐOÀN THỊ LINH", "department\_id": "C18", "job\_title": "ĐIỀU DƯỠNG", "role": "NHÂN VIÊN" }, { "employee\_id": "NV003", "full\_name": "NGUYỄN THỊ HƯỜNG", "department\_id": "A02", "job\_title": "BÁC SĨ", "role": "CHỦ NHIỆM KHOA" } \] }

// Component: SmartDropdown (Hộp thả xuống thông minh \- Tìm kiếm & Lọc liên hoàn) // Inputs: // \- dataList: Danh sách dữ liệu gốc (Khoa hoặc Nhân viên) // \- parentFilterId: ID liên kết từ cấp cha (VD: Mã Khoa để lọc Nhân viên) // \- allowFreeText: Cờ xác định có cho phép nhập đối tượng vãng lai hay không

COMPONENT SmartDropdown(dataList, parentFilterId, allowFreeText): // 1\. Khởi tạo trạng thái (States) STATE isOpen \= FALSE STATE searchKeyword \= "" STATE selectedItem \= NULL STATE freeTextValue \= ""

// 2\. Logic Lọc dữ liệu liên hoàn (Cascading Filter)

// Nếu có parentFilterId (đã chọn Khoa), chỉ giữ lại các Nhân viên thuộc Khoa đó

COMPUTED cascadedList \= FILTER dataList WHERE:

    item.department\_id \== parentFilterId OR parentFilterId \== NULL

// 3\. Logic Lọc dữ liệu thời gian thực (Real-time Search Filtering)

// Lọc cascadedList dựa trên từ khóa người dùng đang gõ

COMPUTED filteredList \= FILTER cascadedList WHERE:

    LOWERCASE(item.name) CONTAINS LOWERCASE(searchKeyword)

    OR LOWERCASE(item.id) CONTAINS LOWERCASE(searchKeyword)

// 4\. Các hàm xử lý sự kiện (Event Handlers)

FUNCTION handleTyping(text):

    searchKeyword \= text

    isOpen \= TRUE

FUNCTION handleSelect(item):

    selectedItem \= item

    searchKeyword \= item.name

    freeTextValue \= ""

    isOpen \= FALSE

    EMIT\_EVENT "onSelectionChange" WITH item.id

FUNCTION handleFreeText(text):

    freeTextValue \= text

    selectedItem \= NULL

    EMIT\_EVENT "onFreeTextSubmit" WITH text

// 5\. Kết xuất Giao diện (Render UI)

RENDER:

    // Vùng nhập liệu Text Input (Hoạt động như thanh tìm kiếm)

    UI\_ELEMENT TextInput:

        ON\_FOCUS: isOpen \= TRUE

        ON\_INPUT: handleTyping(input.value)

        VALUE: searchKeyword

        PLACEHOLDER: "Gõ để tìm kiếm (VD: Tên khoa, Tên nhân sự)..."

        ICON: "Search"

    // Khối danh sách thả xuống (Dropdown Menu)

    IF isOpen \== TRUE:

        UI\_ELEMENT DropdownMenu:

            // Kết xuất danh sách đã lọc thời gian thực

            IF filteredList.LENGTH \&gt; 0:

                FOR EACH item IN filteredList:

                    UI\_ELEMENT DropdownItem:

                        TEXT: item.id \+ " \- " \+ item.name

                        ON\_CLICK: handleSelect(item)

            ELSE:

                UI\_ELEMENT EmptyStateText:

                    TEXT: "Không tìm thấy kết quả trong hệ thống."

            // Khu vực nhập tay tự do cho đối tượng vãng lai (Sinh viên, Ngoại viện...)

            IF allowFreeText \== TRUE:

                UI\_ELEMENT Divider

                UI\_ELEMENT FreeTextInputArea:

                    PLACEHOLDER: "Nhập tên đối tượng vãng lai..."

                    ON\_INPUT: handleFreeText(input.value)

                    VALUE: freeTextValue

                    BUTTON "Xác nhận": ON\_CLICK \= (isOpen \= FALSE)

END COMPONENT

 \--------------- 

\#\#\# Lược đồ Phân quyền Hệ thống Quản lý Kiểm soát Nhiễm khuẩn

{ "$schema": "http://json-schema.org/draft-07/schema\#", "title": "RBAC\_Schema\_KSNK\_103", "description": "Lược đồ JSON định nghĩa cấu trúc phân quyền (RBAC) dựa trên Bản đặc tả yêu cầu nghiệp vụ (BRD) Hệ thống Quản lý KSNK", "type": "object", "required": \[ "danh\_sach\_vai\_tro", "quyen\_han\_tuong\_ung" \], "properties": { "danh\_sach\_vai\_tro": { "type": "array", "description": "Danh sách các nhóm người dùng có tương tác với hệ thống", "items": { "type": "object", "required": \[ "ma\_vai\_tro", "ten\_vai\_tro", "pham\_vi\_du\_lieu", "danh\_sach\_quyen" \], "properties": { "ma\_vai\_tro": { "type": "string", "description": "Mã định danh duy nhất của vai trò" }, "ten\_vai\_tro": { "type": "string", "description": "Tên hiển thị của vai trò người dùng" }, "pham\_vi\_du\_lieu": { "type": "string", "enum": \[ "TOAN\_HE\_THONG", "TOAN\_BENH\_VIEN", "KHOA\_PHONG\_NOI\_BO", "CA\_NHAN" \], "description": "Giới hạn phạm vi dữ liệu mà vai trò này được phép truy cập" }, "danh\_sach\_quyen": { "type": "array", "description": "Mảng chứa các mã quyền hạn được cấp cho vai trò này", "items": { "type": "string" } } } } }, "quyen\_han\_tuong\_ung": { "type": "array", "description": "Danh sách các quyền hạn thao tác và dữ liệu được định nghĩa trong hệ thống", "items": { "type": "object", "required": \[ "ma\_quyen", "mo\_ta\_quyen" \], "properties": { "ma\_quyen": { "type": "string" }, "mo\_ta\_quyen": { "type": "string" } } } } }, "default": { "quyen\_han\_tuong\_ung": \[ { "ma\_quyen": "SYSTEM\_FULL\_ACCESS", "mo\_ta\_quyen": "Toàn quyền can thiệp CSDL, backup/restore hệ thống" }, { "ma\_quyen": "FORM\_CREATE\_CONFIG", "mo\_ta\_quyen": "Quản trị hệ thống bằng Excel, thiết lập danh mục, tạo biểu mẫu, bảng kiểm" }, { "ma\_quyen": "REPORT\_VIEW\_GLOBAL", "mo\_ta\_quyen": "Xem báo cáo tổng thể, biểu đồ, xếp hạng thi đua toàn Bệnh viện" }, { "ma\_quyen": "REPORT\_APPROVE", "mo\_ta\_quyen": "Ký duyệt báo cáo thống kê, duyệt ca bệnh NKBV (HAI)" }, { "ma\_quyen": "SURVEILLANCE\_CROSS\_AUDIT", "mo\_ta\_quyen": "Đánh giá chéo tất cả các khoa trong bệnh viện" }, { "ma\_quyen": "DATA\_INPUT\_CREATE", "mo\_ta\_quyen": "Thực hiện đánh giá, nhập liệu, tạo ca bệnh, báo cáo tai nạn nghề nghiệp" }, { "ma\_quyen": "REPORT\_VIEW\_DEPT", "mo\_ta\_quyen": "Chỉ được xem số liệu, ca NKBV, tỷ lệ tuân thủ giới hạn duy nhất trong phạm vi Khoa của mình (Không được sửa dữ liệu)" }, { "ma\_quyen": "PERSONAL\_VIEW\_SCORE", "mo\_ta\_quyen": "Truy cập xem điểm tuân thủ cá nhân" }, { "ma\_quyen": "ALERT\_VIEW\_LOCAL", "mo\_ta\_quyen": "Đọc các cảnh báo sai sót hệ thống đẩy theo vùng" } \], "danh\_sach\_vai\_tro": \[ { "ma\_vai\_tro": "ADMIN", "ten\_vai\_tro": "Quản trị viên hệ thống", "pham\_vi\_du\_lieu": "TOAN\_HE\_THONG", "danh\_sach\_quyen": \[ "SYSTEM\_FULL\_ACCESS", "FORM\_CREATE\_CONFIG" \] }, { "ma\_vai\_tro": "BOD\_IPC\_LEADER", "ten\_vai\_tro": "Ban Giám đốc & Lãnh đạo Khoa KSNK", "pham\_vi\_du\_lieu": "TOAN\_BENH\_VIEN", "danh\_sach\_quyen": \[ "REPORT\_VIEW\_GLOBAL", "REPORT\_APPROVE", "SURVEILLANCE\_CROSS\_AUDIT" \] }, { "ma\_vai\_tro": "IPC\_STAFF", "ten\_vai\_tro": "Nhân sự KSNK chuyên trách (Người đi giám sát)", "pham\_vi\_du\_lieu": "TOAN\_BENH\_VIEN", "danh\_sach\_quyen": \[ "DATA\_INPUT\_CREATE", "SURVEILLANCE\_CROSS\_AUDIT", "REPORT\_VIEW\_GLOBAL" \] }, { "ma\_vai\_tro": "CLINICAL\_DEPT\_LEADER", "ten\_vai\_tro": "Trưởng/Phó khoa lâm sàng & Điều dưỡng trưởng", "pham\_vi\_du\_lieu": "KHOA\_PHONG\_NOI\_BO", "danh\_sach\_quyen": \[ "REPORT\_VIEW\_DEPT" \] }, { "ma\_vai\_tro": "MEDICAL\_STAFF", "ten\_vai\_tro": "Mạng lưới KSNK / Bác sĩ / Điều dưỡng / Hộ lý", "pham\_vi\_du\_lieu": "CA\_NHAN", "danh\_sach\_quyen": \[ "DATA\_INPUT\_CREATE", "PERSONAL\_VIEW\_SCORE", "ALERT\_VIEW\_LOCAL" \] } \] } }

 \--------------- 

\#\#\# Thuật Toán Tính Tỷ Lệ Tuân Thủ Bảng Kiểm

FUNCTION TinhTyLeTuanThuBangKiem(payload) SET tong\_diem\_dat \= 0 SET tong\_diem\_toi\_da \= 0

FOR EACH tieu\_chi IN payload.criteria\_array:

    IF tieu\_chi.ket\_qua\_danh\_gia \== "KhongApDung" THEN

        CONTINUE

    END IF

    IF TYPEOF(tieu\_chi.ket\_qua\_danh\_gia) \== "String" THEN

        tong\_diem\_toi\_da \= tong\_diem\_toi\_da \+ 1

        IF tieu\_chi.ket\_qua\_danh\_gia \== "Dat" THEN

            tong\_diem\_dat \= tong\_diem\_dat \+ 1

        END IF

    ELSE IF TYPEOF(tieu\_chi.ket\_qua\_danh\_gia) \== "Integer" THEN

        tong\_diem\_toi\_da \= tong\_diem\_toi\_da \+ 5

        tong\_diem\_dat \= tong\_diem\_dat \+ tieu\_chi.ket\_qua\_danh\_gia

    END IF

END FOR

SET ty\_le\_tuan\_thu \= 0

IF tong\_diem\_toi\_da \&gt; 0 THEN

    ty\_le\_tuan\_thu \= (tong\_diem\_dat / tong\_diem\_toi\_da) \* 100

END IF

RETURN ROUND(ty\_le\_tuan\_thu, 2\)

END FUNCTION

 \--------------- 

\#\#\# Danh Mục Và Hệ Thống Cảnh Báo Lỗi Trọng Yếu

{ "$schema": "http://json-schema.org/draft-07/schema\#", "title": "DanhMucLoiTrongYeu", "description": "Lược đồ định nghĩa danh sách các mã lỗi trọng yếu (Red Flags) theo phân hệ", "type": "array", "items": { "type": "object", "properties": { "ma\_loi": { "type": "string" }, "phan\_he": { "type": "string", "enum": \[ "QuanLyChatThai", "VeSinhMoiTruong", "XuLyDungCu" \] }, "mo\_ta": { "type": "string" } }, "required": \[ "ma\_loi", "phan\_he", "mo\_ta" \] }, "default": \[ { "ma\_loi": "RF\_CT\_01", "phan\_he": "QuanLyChatThai", "mo\_ta": "Thùng XANH: Có chứa rác lây nhiễm (bông gạc)" }, { "ma\_loi": "RF\_CT\_02", "phan\_he": "QuanLyChatThai", "mo\_ta": "Thùng VÀNG: Có chứa rác sinh hoạt/tái chế" }, { "ma\_loi": "RF\_MT\_01", "phan\_he": "VeSinhMoiTruong", "mo\_ta": "Nhân viên y tế giũ đồ vải bẩn trong không khí" }, { "ma\_loi": "RF\_MT\_02", "phan\_he": "VeSinhMoiTruong", "mo\_ta": "Sử dụng chung xe vận chuyển đồ vải/dụng cụ BẨN và SẠCH" }, { "ma\_loi": "RF\_DC\_01", "phan\_he": "XuLyDungCu", "mo\_ta": "Sử dụng gói dụng cụ vô khuẩn bị rách, thủng, hở mép, ướt/ẩm" }, { "ma\_loi": "RF\_DC\_02", "phan\_he": "XuLyDungCu", "mo\_ta": "Kết quả chỉ thị sinh học (BI) dương tính (Vi khuẩn còn sống)" } \] }

// Lắng nghe sự kiện nộp phiếu giám sát (Submit Monitoring Form) ON EVENT "SubmitMonitoringForm" GIVEN payload AS BangKiemGiamSatTuanThu:

// Khởi tạo mảng lưu trữ các lỗi trọng yếu phát hiện được

SET danh\_sach\_loi\_trong\_yeu \= \[\]

// Quét toàn bộ tiêu chí đánh giá trong mảng

FOR EACH tieu\_chi IN payload.criteria\_array:

    // Kích hoạt điều kiện cảnh báo đỏ dựa trên BRD

    IF tieu\_chi.is\_red\_flag \== TRUE AND tieu\_chi.ket\_qua\_danh\_gia \== "KhongDat" THEN

        APPEND tieu\_chi TO danh\_sach\_loi\_trong\_yeu

    END IF

END FOR

// Nếu tồn tại ít nhất 1 lỗi trọng yếu, kích hoạt tiến trình nền (Background Worker)

IF LENGTH(danh\_sach\_loi\_trong\_yeu) \&gt; 0 THEN

    // Đóng gói dữ liệu cảnh báo

    SET alert\_payload \= {

        "thoi\_gian\_vi\_pham": payload.metadata.thoi\_gian,

        "id\_khoa\_phong": payload.metadata.id\_khoa\_phong,

        "id\_nguoi\_giam\_sat": payload.metadata.id\_nguoi\_giam\_sat,

        "id\_nguoi\_vi\_pham": payload.metadata.id\_doi\_tuong\_giam\_sat,

        "chi\_tiet\_loi": danh\_sach\_loi\_trong\_yeu

    }

    // Gọi hàm thực thi Webhook báo cáo khẩn cấp

    CALL SendAlertWebhook(alert\_payload)

END IF

END EVENT

// Định nghĩa hàm gửi cảnh báo FUNCTION SendAlertWebhook(data) SET webhook\_endpoint \= "https://api.hospital.vn/v1/alerts/webhook" SET headers \= {"Content-Type": "application/json", "Authorization": "Bearer {TOKEN}"}

TRY

    HTTP\_POST(url \= webhook\_endpoint, headers \= headers, body \= data)

    LOG\_INFO("Cảnh báo đỏ đã được gửi thành công.")

CATCH ERROR AS e

    LOG\_ERROR("Lỗi khi gửi cảnh báo đỏ: " \+ e.message)

END TRY

END FUNCTION

 \--------------- 

\#\#\# Lược Đồ Cơ Sở Dữ Liệu Giám Sát Tuân Thủ KSNK

{ "$schema": "http://json-schema.org/draft-07/schema\#", "title": "BangKiemGiamSatTuanThu", "description": "Lược đồ cơ sở dữ liệu động (Dynamic Schema) lưu trữ dữ liệu bảng kiểm giám sát tuân thủ KSNK", "type": "object", "properties": { "metadata": { "type": "object", "description": "Phần thông tin hành chính", "properties": { "thoi\_gian": { "type": "string", "format": "date-time" }, "id\_khoa\_phong": { "type": "string" }, "id\_nguoi\_giam\_sat": { "type": "string" }, "id\_doi\_tuong\_giam\_sat": { "type": "string" } }, "required": \[ "thoi\_gian", "id\_khoa\_phong", "id\_nguoi\_giam\_sat", "id\_doi\_tuong\_giam\_sat" \] }, "criteria\_array": { "type": "array", "description": "Phần mảng tiêu chí đánh giá", "items": { "type": "object", "properties": { "id\_tieu\_chi": { "type": "string" }, "ket\_qua\_danh\_gia": { "oneOf": \[ { "type": "string", "enum": \[ "Dat", "KhongDat" \], "description": "Thang đo: Dat\_KhongDat" }, { "type": "string", "enum": \[ "Dat", "KhongDat", "KhongApDung" \], "description": "Thang đo: Dat\_KhongDat\_KhongApDung" }, { "type": "integer", "minimum": 1, "maximum": 5, "description": "Thang đo: ThangDiem\_1\_5" } \] }, "ghi\_chu\_loi": { "type": \[ "string", "null" \] }, "is\_red\_flag": { "type": "boolean" } }, "required": \[ "id\_tieu\_chi", "ket\_qua\_danh\_gia", "is\_red\_flag" \] }, "minItems": 1 } }, "required": \[ "metadata", "criteria\_array" \] }

 \--------------- 

\#\#\# Thuật Toán Trải Ngang Dữ Liệu Vệ Sinh Tay WHO

// \============================================================================ // THUẬT TOÁN TRÍCH XUẤT VÀ TRẢI NGANG DỮ LIỆU (DATA FLATTENING ALGORITHM) // MỤC TIÊU: KẾT XUẤT TỆP ĐỊNH DẠNG TƯƠNG THÍCH SPSS/STATA \[1\] // ĐỐI TƯỢNG: PHÂN HỆ GIÁM SÁT VỆ SINH TAY THEO CHUẨN WHO \[1, 2\] // \============================================================================

FUNCTION Flatten\_Hand\_Hygiene\_Data\_For\_SPSS(Raw\_JSON\_Export\_Data) // Khởi tạo mảng chứa dữ liệu đã trải ngang, trong đó mỗi phần tử đại diện cho một hàng (Row) trên Excel \[1\]. SET Flat\_Data\_Table \= EMPTY ARRAY

// Định nghĩa hằng số mảng 5 thời điểm vệ sinh tay chuẩn theo WHO để tạo thành 5 cột độc lập \[2, 3\].

CONSTANT WHO\_5\_MOMENTS \= \["T-TXNB", "T-TTVK", "S-DCT", "S-TXNB", "S-XQNB"\]

// Duyệt qua từng phiên giám sát trong tập dữ liệu đầu vào.

FOR EACH Session IN Raw\_JSON\_Export\_Data.Sessions

    // Trích xuất cấu trúc siêu dữ liệu hành chính chung của phiên giám sát \[4\].

    SET Meta\_Observer \= Session.Metadata.Nguoi\_Giam\_Sat

    SET Meta\_Dept \= Session.Metadata.Khoa\_Phong

    SET Meta\_Location \= Session.Metadata.Khu\_Vuc\_Chi\_Tiet

    SET Meta\_Time \= Session.Metadata.Thoi\_Gian

    // Duyệt qua mảng các nhân viên y tế được giám sát đồng thời trong phiên (Giao diện đa mục tiêu tối đa 3 người) \[2, 5\].

    FOR EACH Observee IN Session.Observations

        SET Subj\_Role \= Observee.Nhom\_Doi\_Tuong

        SET Subj\_Name \= Observee.Ten\_Dich\_Danh

        // Duyệt qua từng "Cơ hội vệ sinh tay" của nhân viên y tế đó \[1\].

        FOR EACH Opportunity IN Observee.Opportunities

            // Khởi tạo một hàng dữ liệu mới độc lập cho mỗi cơ hội VST, đảm bảo nguyên tắc tách dòng \[1\].

            CREATE Flat\_Row AS NEW DICTIONARY

            // 1\. Gắn các biến số định danh và hành chính vào hàng hiện tại \[4\].

            Flat\_Row\["Thoi\_Gian"\] \= Meta\_Time

            Flat\_Row\["Khoa\_Phong"\] \= Meta\_Dept

            Flat\_Row\["Khu\_Vuc"\] \= Meta\_Location

            Flat\_Row\["Nguoi\_Giam\_Sat"\] \= Meta\_Observer

            Flat\_Row\["Nhom\_Doi\_Tuong"\] \= Subj\_Role

            Flat\_Row\["Doi\_Tuong\_Giam\_Sat"\] \= Subj\_Name

            // 2\. THUẬT TOÁN TRẢI NGANG (FLATTENING) BIẾN SỐ ĐA LỰA CHỌN \[1\].

            // Xử lý mảng "Thời điểm chỉ định" (chứa tối đa 2 giá trị) thành 5 cột nhị phân độc lập \[1, 2\].

            FOR EACH Moment IN WHO\_5\_MOMENTS

                // Quét kiểm tra xem thời điểm chuẩn (Moment) có tồn tại trong mảng lựa chọn của cơ hội này không.

                IF Opportunity.Thoi\_Diem\_Chi\_Dinh CONTAINS Moment THEN

                    Flat\_Row\[Moment\] \= 1 // Gán giá trị nhị phân 1 nếu thời điểm đó được chọn \[1\].

                ELSE

                    Flat\_Row\[Moment\] \= 0 // Gán giá trị nhị phân 0 nếu thời điểm đó không được chọn \[1\].

                END IF

            END FOR

            // 3\. Trích xuất biến số Hành động và ánh xạ các chỉ số phụ thành dạng nhị phân \[3\].

            Flat\_Row\["Hanh\_Dong\_VST"\] \= Opportunity.Hanh\_Dong\_VST // Nhận giá trị: NUOC, CON, hoặc BO\_SOT \[3\].

            // Áp dụng logic rẽ nhánh cho các biến số phụ thuộc dựa trên Hành động VST \[2, 3\].

            IF Opportunity.Hanh\_Dong\_VST \== "BO\_SOT" THEN

                // Nếu bỏ sót, các biến kỹ thuật và thời gian bị vô hiệu hóa (Gán giá trị rỗng/Missing Value trong SPSS) \[2\].

                Flat\_Row\["Dung\_Ky\_Thuat"\] \= NULL

                Flat\_Row\["Du\_Thoi\_Gian"\] \= NULL

                // Trích xuất biến lạm dụng găng tay thành định dạng nhị phân 1/0 \[2, 3\].

                Flat\_Row\["Lam\_Dung\_Gang\_Tay"\] \= IF Opportunity.Lam\_Dung\_Gang\_Tay \== TRUE THEN 1 ELSE 0

            ELSE

                // Nếu có thực hiện VST (Nước/Cồn), trích xuất biến kỹ thuật và thời gian thành định dạng nhị phân 1/0 \[3\].

                Flat\_Row\["Dung\_Ky\_Thuat"\] \= IF Opportunity.Dung\_Ky\_Thuat \== TRUE THEN 1 ELSE 0

                Flat\_Row\["Du\_Thoi\_Gian"\] \= IF Opportunity.Du\_Thoi\_Gian \== TRUE THEN 1 ELSE 0

                // Biến lạm dụng găng tay không tồn tại trong logic này, gán rỗng \[2\].

                Flat\_Row\["Lam\_Dung\_Gang\_Tay"\] \= NULL

            END IF

            // Trích xuất ghi chú văn bản tự do (nếu có) \[3\].

            Flat\_Row\["Ghi\_Chu"\] \= Opportunity.Ghi\_Chu\_Tu\_Do

            // 4\. Đẩy hàng dữ liệu (Row) đã được trải ngang và mã hóa nhị phân hoàn chỉnh vào mảng dữ liệu tổng \[1\].

            APPEND Flat\_Row TO Flat\_Data\_Table

        END FOR

    END FOR

END FOR

// Kết xuất mảng dữ liệu phẳng thành tệp định dạng ma trận (Excel/CSV) tương thích 100% với cấu trúc biến của SPSS/Stata \[1\].

RETURN Export\_To\_Data\_Matrix(Flat\_Data\_Table)

END FUNCTION

 \--------------- 

\#\#\# Hệ Thống Cảnh Báo Lỗi Trọng Yếu Kiểm Soát Nhiễm Khuẩn

{ "$schema": "http://json-schema.org/draft-07/schema\#", "title": "RedFlagCriteriaDictionary", "description": "Lược đồ JSON định nghĩa danh sách các mã lỗi trọng yếu (Red Flag) trong hệ thống Giám sát tuân thủ KSNK.", "type": "object", "properties": { "CriticalErrorCodes": { "type": "array", "description": "Danh sách các mã định danh tiêu chí vi phạm nghiêm trọng kích hoạt cảnh báo đỏ.", "items": { "type": "object", "properties": { "error\_code": { "type": "string", "enum": \[ "ERR\_HH\_MISSED\_BEFORE\_ASEPTIC", "ERR\_HH\_GLOVE\_ABUSE", "ERR\_WASTE\_MIXED\_INFECTIOUS\_INTO\_GENERAL", "ERR\_WASTE\_MIXED\_GENERAL\_INTO\_INFECTIOUS", "ERR\_LINEN\_SHAKING\_IN\_AIR", "ERR\_LINEN\_MIXED\_TRANSPORT\_CART", "ERR\_INJ\_RECAPPING\_TWO\_HANDS", "ERR\_INJ\_BENDING\_OR\_REMOVING\_NEEDLE" \] }, "error\_description": { "type": "string" }, "module": { "type": "string", "enum": \[ "HandHygiene", "WasteManagement", "LinenManagement", "InjectionSafety" \] } }, "required": \[ "error\_code", "error\_description", "module" \] } } }, "default": { "CriticalErrorCodes": \[ { "error\_code": "ERR\_HH\_MISSED\_BEFORE\_ASEPTIC", "error\_description": "Bỏ sót vệ sinh tay TRƯỚC thủ thuật vô khuẩn (T-TTVK).", "module": "HandHygiene" }, { "error\_code": "ERR\_HH\_GLOVE\_ABUSE", "error\_description": "Lạm dụng găng tay y tế thay thế cho hành động vệ sinh tay.", "module": "HandHygiene" }, { "error\_code": "ERR\_WASTE\_MIXED\_INFECTIOUS\_INTO\_GENERAL", "error\_description": "Thùng XANH (sinh hoạt) có chứa rác lây nhiễm (bông gạc dính máu/dịch).", "module": "WasteManagement" }, { "error\_code": "ERR\_WASTE\_MIXED\_GENERAL\_INTO\_INFECTIOUS", "error\_description": "Thùng VÀNG (lây nhiễm) có chứa rác sinh hoạt/tái chế.", "module": "WasteManagement" }, { "error\_code": "ERR\_LINEN\_SHAKING\_IN\_AIR", "error\_description": "Nhân viên y tế giũ đồ vải bẩn/lây nhiễm trong không khí.", "module": "LinenManagement" }, { "error\_code": "ERR\_LINEN\_MIXED\_TRANSPORT\_CART", "error\_description": "Sử dụng chung xe vận chuyển cho cả đồ vải BẨN và đồ vải SẠCH.", "module": "LinenManagement" }, { "error\_code": "ERR\_INJ\_RECAPPING\_TWO\_HANDS", "error\_description": "Đậy nắp kim tiêm bằng 2 tay sau khi thực hiện thủ thuật.", "module": "InjectionSafety" }, { "error\_code": "ERR\_INJ\_BENDING\_OR\_REMOVING\_NEEDLE", "error\_description": "Tháo rời kim tiêm hoặc bẻ cong kim bằng tay thủ công.", "module": "InjectionSafety" } \] } }

// \============================================================================ // ĐỘNG CƠ CẢNH BÁO THỜI GIAN THỰC (REAL-TIME ALERT ENGINE) // BACKGROUND WORKER: KÍCH HOẠT WEBHOOK KHI PHÁT HIỆN LỖI TRỌNG YẾU // \============================================================================

FUNCTION Process\_Incoming\_Surveillance\_Payload(Payload): // Trích xuất siêu dữ liệu hành chính SET Meta\_ThoiGian \= Payload.Metadata.thoi\_gian SET Meta\_KhoaPhong \= Payload.Metadata.khoa\_phong SET Meta\_NguoiViPham \= Payload.Metadata.doi\_tuong\_giam\_sat SET Meta\_NguoiGiamSat \= Payload.Metadata.nguoi\_giam\_sat

SET Critical\_Violations \= EMPTY ARRAY

// 1\. Xử lý logic Red Flag cho phân hệ Bảng kiểm chung (General Checklists)

IF EXISTS Payload.Criteria THEN

    FOR EACH Criterion IN Payload.Criteria:

        IF Criterion.is\_red\_flag \== TRUE AND Criterion.ket\_qua\_danh\_gia \== "KhongDat" THEN

            APPEND {

                "Error\_Code": Criterion.id\_tieu\_chi,

                "Description": Criterion.noi\_dung\_cau\_hoi

            } TO Critical\_Violations

        END IF

    END FOR

END IF

// 2\. Xử lý logic Red Flag đặc thù cho phân hệ Vệ sinh tay (Hand Hygiene WHO)

IF EXISTS Payload.HandHygiene\_Opportunities THEN

    FOR EACH Opportunity IN Payload.HandHygiene\_Opportunities:

        // Ràng buộc 1: Bỏ sót VST trước thủ thuật vô khuẩn

        IF Opportunity.hanh\_dong\_vst \== "BO\_SOT" AND (Opportunity.thoi\_diem\_chi\_dinh CONTAINS "T-TTVK") THEN

            APPEND {

                "Error\_Code": "ERR\_HH\_MISSED\_BEFORE\_ASEPTIC",

                "Description": "Bỏ sót vệ sinh tay TRƯỚC thủ thuật vô khuẩn"

            } TO Critical\_Violations

        END IF

        // Ràng buộc 2: Lạm dụng găng tay thay cho VST

        IF Opportunity.hanh\_dong\_vst \== "BO\_SOT" AND Opportunity.lam\_dung\_gang\_tay \== TRUE THEN

            APPEND {

                "Error\_Code": "ERR\_HH\_GLOVE\_ABUSE",

                "Description": "Lạm dụng găng tay thay thế cho vệ sinh tay"

            } TO Critical\_Violations

        END IF

    END FOR

END IF

// 3\. Kích hoạt Webhook nếu tồn tại lỗi trọng yếu

IF COUNT(Critical\_Violations) \&gt; 0 THEN

    TriggerWebhook(Meta\_ThoiGian, Meta\_KhoaPhong, Meta\_NguoiViPham, Meta\_NguoiGiamSat, Critical\_Violations)

END IF

// 4\. Lưu dữ liệu bình thường vào CSDL

Save\_To\_Database(Payload)

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM KÍCH HOẠT WEBHOOK GỬI TIN NHẮN (ZALO OA / TELEGRAM BOT) // \---------------------------------------------------------------------------- FUNCTION TriggerWebhook(Time, Department, Violator, Observer, Violations\_List): // Đóng gói dữ liệu Payload gửi đi SET Alert\_Payload \= { "Level": "CRITICAL\_RED\_FLAG", "Timestamp": Time, "Department": Department, "Violator\_Name\_Or\_ID": Violator, "Observer": Observer, "Violations": Violations\_List, "Message": "\[CẢNH BÁO KSNK\] Phát hiện vi phạm an toàn người bệnh nghiêm trọng cần can thiệp tức thời." }

// Cấu hình Header và Endpoint

SET Webhook\_URL \= "https://api.internal-hospital.vn/v1/notifications/red-flag"

SET Headers \= {

    "Content-Type": "application/json",

    "Authorization": "Bearer 

\--------------------------------------------------------------------------------

**Cấu trúc và Logic Giám sát Vệ sinh tay WHO**

{

  "$schema": "http://json-schema.org/draft-07/schema\#",

  "title": "ObservationOpportunitiesMatrix",

  "description": "Cấu trúc lưu trữ mảng Cơ hội vệ sinh tay theo chuẩn WHO \[1, 2\].",

  "type": "array",

  "items": {

    "type": "object",

    "properties": {

      "thoi\_diem\_chi\_dinh": {

        "type": "array",

        "description": "5 Thời điểm Chỉ định (Cho phép chọn tối đa 2): Trước chạm người bệnh (T-TXNB), Trước thủ thuật vô khuẩn (T-TTVK), Sau phơi nhiễm dịch (S-DCT), Sau chạm người bệnh (S-TXNB), Sau chạm vật dụng xung quanh (S-XQNB) \[1, 2\].",

        "items": {

          "type": "string",

          "enum": \[

            "T-TXNB",

            "T-TTVK",

            "S-DCT",

            "S-TXNB",

            "S-XQNB"

          \]

        },

        "minItems": 1,

        "maxItems": 2,

        "uniqueItems": true

      },

      "hanh\_dong\_vst": {

        "type": "string",

        "description": "Hành động VST (Chọn 1): Rửa bằng nước \&amp; xà phòng / Sát khuẩn bằng cồn / Bỏ sót \[1, 2\].",

        "enum": \[

          "RUA\_TAY\_NUOC",

          "CHA\_TAY\_CON",

          "BO\_SOT"

        \]

      },

      "dung\_ky\_thuat": {

        "type": \[

          "boolean",

          "null"

        \],

        "description": "Đánh giá Đúng/Sai kỹ thuật (Chỉ hiển thị nếu Hành động là Rửa nước hoặc Cồn) \[1, 2\]."

      },

      "du\_thoi\_gian": {

        "type": \[

          "boolean",

          "null"

        \],

        "description": "Đánh giá Đủ/Thiếu thời gian (Chỉ hiển thị nếu Hành động là Rửa nước hoặc Cồn) \[1, 2\]."

      },

      "lam\_dung\_gang\_tay": {

        "type": \[

          "boolean",

          "null"

        \],

        "description": "Bắt buộc hiển thị câu hỏi Có lạm dụng găng tay không? chỉ khi Hành động được chọn là Bỏ sót \[1, 2\]."

      }

    },

    "required": \[

      "thoi\_diem\_chi\_dinh",

      "hanh\_dong\_vst"

    \],

    "allOf": \[

      {

        "if": {

          "properties": {

            "hanh\_dong\_vst": {

              "const": "BO\_SOT"

            }

          }

        },

        "then": {

          "properties": {

            "dung\_ky\_thuat": {

              "type": "null"

            },

            "du\_thoi\_gian": {

              "type": "null"

            },

            "lam\_dung\_gang\_tay": {

              "type": "boolean"

            }

          },

          "required": \[

            "lam\_dung\_gang\_tay"

          \]

        },

        "else": {

          "properties": {

            "dung\_ky\_thuat": {

              "type": "boolean"

            },

            "du\_thoi\_gian": {

              "type": "boolean"

            },

            "lam\_dung\_gang\_tay": {

              "type": "null"

            }

          },

          "required": \[

            "dung\_ky\_thuat",

            "du\_thoi\_gian"

          \]

        }

      }

    \]

  }

}

// \============================================================================

// HỆ THỐNG GIÁM SÁT VỆ SINH TAY \- LOGIC RẼ NHÁNH GIAO DIỆN (UI CONDITIONAL)

// THAM CHIẾU: Bản đặc tả yêu cầu nghiệp vụ (BRD) \- Phân hệ Vệ sinh tay \[1-3\].

// NGÔN NGỮ: Pseudocode

// \============================================================================

\* KHỞI TẠO BIẾN TRẠNG THÁI (STATE):

  \- ARRAY thoi\_diem\_chi\_dinh \= \[\]

  \- STRING hanh\_dong\_vst \= NULL

  \- UI\_COMPONENT box\_ky\_thuat\_thoi\_gian \= ENABLED

  \- UI\_COMPONENT box\_lam\_dung\_gang\_tay \= DISABLED

\* HÀM XỬ LÝ SỰ KIỆN: ON\_SELECT\_THOI\_DIEM(value)

  \- NẾU value ĐÃ TỒN TẠI TRONG thoi\_diem\_chi\_dinh:

      \- REMOVE(thoi\_diem\_chi\_dinh, value)

  \- NGƯỢC LẠI:

      // Cho phép chọn tối đa 2 trong 5 giá trị \[1-3\].

      \- NẾU LENGTH(thoi\_diem\_chi\_dinh) \&lt; 2:

          \- APPEND(thoi\_diem\_chi\_dinh, value)

      \- NGƯỢC LẠI:

          \- THROW\_ALERT("Chỉ cho phép chọn tối đa 2 thời điểm cùng lúc cho mỗi thao tác \[3\].")

\* HÀM XỬ LÝ SỰ KIỆN: ON\_CHANGE\_HANH\_DONG(action\_value)

  \- GÁN hanh\_dong\_vst \= action\_value

  \- KIỂM TRA ĐIỀU KIỆN (LOGIC RẼ NHÁNH):

      \- NẾU hanh\_dong\_vst \== "BO\_SOT":

          // Vô hiệu hóa các câu hỏi về kỹ thuật/thời gian \[1\].

          \- GÁN box\_ky\_thuat\_thoi\_gian.visible \= FALSE

          \- GÁN form\_data.dung\_ky\_thuat \= NULL

          \- GÁN form\_data.du\_thoi\_gian \= NULL

          \- SET\_VALIDATION\_REQUIREMENT("dung\_ky\_thuat", OPTIONAL)

          \- SET\_VALIDATION\_REQUIREMENT("du\_thoi\_gian", OPTIONAL)

          // Bắt buộc hiển thị câu hỏi Có lạm dụng găng tay không? chỉ khi Hành động được chọn là Bỏ sót \[1\].

          \- GÁN box\_lam\_dung\_gang\_tay.visible \= TRUE

          \- SET\_VALIDATION\_REQUIREMENT("lam\_dung\_gang\_tay", REQUIRED)

      \- NGƯỢC LẠI NẾU hanh\_dong\_vst IN \["RUA\_TAY\_NUOC", "CHA\_TAY\_CON"\]:

          // Đánh giá Đúng/Sai kỹ thuật và Đủ/Thiếu thời gian (Chỉ hiển thị nếu Hành động là Rửa nước hoặc Cồn) \[1\].

          \- GÁN box\_ky\_thuat\_thoi\_gian.visible \= TRUE

          \- SET\_VALIDATION\_REQUIREMENT("dung\_ky\_thuat", REQUIRED)

          \- SET\_VALIDATION\_REQUIREMENT("du\_thoi\_gian", REQUIRED)

          // Ẩn và xóa dữ liệu lạm dụng găng tay

          \- GÁN box\_lam\_dung\_gang\_tay.visible \= FALSE

          \- GÁN form\_data.lam\_dung\_gang\_tay \= NULL

          \- SET\_VALIDATION\_REQUIREMENT("lam\_dung\_gang\_tay", OPTIONAL)

\--------------------------------------------------------------------------------

**Cấu Trúc Và Logic Giám Sát Kiểm Soát Nhiễm Khuẩn**

{

  "$schema": "http://json-schema.org/draft-07/schema\#",

  "title": "Header\_PhieuGiamSat\_KSNK",

  "description": "Lược đồ JSON lưu trữ thông tin hành chính (Header) của phiếu giám sát tuân thủ KSNK \[1\]. Tích hợp ràng buộc cho trải nghiệm tìm kiếm toàn diện và xử lý đối tượng vãng lai \[2\].",

  "type": "object",

  "properties": {

    "thoi\_gian\_giam\_sat": {

      "type": "string",

      "format": "date-time",

      "description": "Thời điểm thực hiện phiên giám sát, định dạng chuẩn ISO 8601 \[1\]."

    },

    "id\_khoa\_phong": {

      "type": "string",

      "description": "Mã định danh duy nhất của Khoa/Phòng được giám sát \[2\]."

    },

    "id\_khu\_vuc": {

      "type": "string",

      "description": "Mã định danh Khu vực chi tiết (Buồng bệnh/Phòng mổ). Giá trị danh sách phụ thuộc vào id\_khoa\_phong \[2\]."

    },

    "id\_nguoi\_giam\_sat": {

      "type": "string",

      "description": "Mã định danh hệ thống của nhân viên KSNK thực hiện đánh giá (trích xuất tự động từ JWT Token) \[1\]."

    },

    "id\_doi\_tuong\_giam\_sat": {

      "type": "string",

      "description": "Mã định danh nhân viên y tế bị giám sát. Giá trị danh sách phụ thuộc vào id\_khoa\_phong \[2\]."

    },

    "ten\_doi\_tuong\_vang\_lai": {

      "type": "string",

      "description": "Trường Free-text nhập tay dành cho đối tượng không có trong danh bạ biên chế của Khoa (Học viên, SV thực tập, NV vệ sinh công nghiệp) \[2\]."

    }

  },

  "required": \[

    "thoi\_gian\_giam\_sat",

    "id\_khoa\_phong",

    "id\_nguoi\_giam\_sat"

  \],

  "anyOf": \[

    {

      "required": \[

        "id\_doi\_tuong\_giam\_sat"

      \]

    },

    {

      "required": \[

        "ten\_doi\_tuong\_vang\_lai"

      \]

    }

  \]

}

// \============================================================================

// THUẬT TOÁN LOGIC: BỘ LỌC CHÉO ĐA CHIỀU (CASCADING DROPDOWN)

// VÀ TRẢI NGHIỆM TÌM KIẾM TOÀN DIỆN (SEARCHABLE EVERYWHERE) \[2\]

// \============================================================================

\* KHỞI TẠO BIẾN TRẠNG THÁI (STATE):

  \- BIẾN id\_khoa\_phong \= NULL

  \- BIẾN id\_khu\_vuc \= NULL

  \- BIẾN id\_doi\_tuong\_giam\_sat \= NULL

  \- BIẾN ten\_doi\_tuong\_vang\_lai \= NULL

  \- MẢNG DanhSach\_KhuVuc\_HienThi \= \[\]

  \- MẢNG DanhSach\_NhanVien\_HienThi \= \[\]

\* HÀM XỬ LÝ SỰ KIỆN: ON\_CHANGE\_KHOA\_PHONG(Selected\_Khoa\_ID) \[2\]

  // 1\. Cập nhật mã Khoa/Phòng

  \- GÁN id\_khoa\_phong \= Selected\_Khoa\_ID

  // 2\. Đặt lại giá trị của các trường phụ thuộc cấp dưới

  \- GÁN id\_khu\_vuc \= NULL

  \- GÁN id\_doi\_tuong\_giam\_sat \= NULL

  \- GÁN ten\_doi\_tuong\_vang\_lai \= NULL

  // 3\. Thực thi Bộ lọc liên hoàn (Cascading Dropdown Filter) \[2\]

  \- NẾU id\_khoa\_phong \!= NULL:

    \- GÁN DanhSach\_KhuVuc\_HienThi \= FILTER(Database.KhuVuc, KhuVuc.khoa\_id \== id\_khoa\_phong)

    \- GÁN DanhSach\_NhanVien\_HienThi \= FILTER(Database.NhanVien, NhanVien.khoa\_id \== id\_khoa\_phong)

  \- NGƯỢC LẠI:

    \- CLEAR(DanhSach\_KhuVuc\_HienThi)

    \- CLEAR(DanhSach\_NhanVien\_HienThi)

  // 4\. Kích hoạt tính năng tìm kiếm trên danh sách vừa lọc (Searchable Everywhere) \[2\]

  \- ENABLE\_SEARCH\_BAR(DanhSach\_KhuVuc\_HienThi)

  \- ENABLE\_SEARCH\_BAR(DanhSach\_NhanVien\_HienThi)

\* HÀM XỬ LÝ SỰ KIỆN: ON\_SEARCH\_DROPDOWN(Keyword, Target\_List) \[2\]

  // Lọc kết quả tức thì khi người dùng gõ từ khóa, không cần cuộn chuột \[2\]

  \- RETURN FILTER(Target\_List, Item.Name CONTAINS Keyword OR Item.ID CONTAINS Keyword)

\* HÀM XỬ LÝ SỰ KIỆN: ON\_INPUT\_DOI\_TUONG\_VANG\_LAI(FreeText\_Value) \[2\]

  // Xử lý logic nhập liệu linh hoạt cho đối tượng ngoại lai \[2\]

  \- GÁN ten\_doi\_tuong\_vang\_lai \= FreeText\_Value

  \- NẾU LENGTH(ten\_doi\_tuong\_vang\_lai) \&gt; 0:

    \- GÁN id\_doi\_tuong\_giam\_sat \= NULL

    \- DISABLE\_UI\_COMPONENT(Dropdown\_DoiTuongGiamSat)

  \- NGƯỢC LẠI:

    \- ENABLE\_UI\_COMPONENT(Dropdown\_DoiTuongGiamSat)

\--------------------------------------------------------------------------------

**Thuật Toán Và Chỉ Số Báo Cáo Quản Trị BI**

// \============================================================================

// MODULE: BÁO CÁO QUẢN TRỊ THÔNG MINH (BI DASHBOARD)

// ĐỊNH NGHĨA DANH SÁCH KPI VÀ THUẬT TOÁN TÍNH TOÁN DỮ LIỆU \[1, 2\]

// NGÔN NGỮ: PSEUDOCODE

// \============================================================================

// DANH SÁCH CÁC CHỈ SỐ ĐO LƯỜNG (KPIs) ĐƯỢC TRÍCH XUẤT:

// 1\. Chỉ số hiệu suất nhân sự:

//    \- Tổng thời gian làm việc thực tế.

//    \- Thời gian trung bình hoàn thành một khâu.

//    \- Tổng sản lượng hoàn thành.

//    \- Tỷ lệ phần trăm gây lỗi quy trình trên từng cá nhân.

// 2\. Chỉ số vòng đời tài sản:

//    \- Tần suất luân chuyển của bộ dụng cụ.

//    \- Tỷ lệ hao mòn/thất thoát trên từng bộ.

//    \- Chi phí duy tu bảo dưỡng trên mỗi thiết bị máy móc.

// 3\. Chỉ số hậu cần:

//    \- Tốc độ tiêu hao (Burn-rate) của các loại hóa chất.

//    \- Dự báo nhu cầu nhập kho tháng tiếp theo.

// \----------------------------------------------------------------------------

// THUẬT TOÁN TÍNH TOÁN CHỈ SỐ HIỆU SUẤT NHÂN SỰ

// \----------------------------------------------------------------------------

\* THỜI GIAN TRUNG BÌNH HOÀN THÀNH MỘT KHÂU:

  FUNCTION Calculate\_Average\_Stage\_Time(Employee\_ID, Stage\_ID, Time\_Window):

      SET Total\_Duration \= 0

      SET Completed\_Tasks \= 0

      Logs \= FETCH\_TRANSACTION\_LOGS(Employee\_ID, Stage\_ID, Time\_Window)

      FOR EACH Log IN Logs:

          IF Log.Status \== "COMPLETED" THEN

              Task\_Duration \= Log.End\_Time \- Log.Start\_Time

              Total\_Duration \= Total\_Duration \+ Task\_Duration

              Completed\_Tasks \= Completed\_Tasks \+ 1

          END IF

      END FOR

      IF Completed\_Tasks \== 0 THEN

          RETURN 0

      ELSE

          RETURN Total\_Duration / Completed\_Tasks

      END IF

  END FUNCTION

\* TỶ LỆ LỖI QUY TRÌNH TRÊN TỪNG CÁ NHÂN:

  FUNCTION Calculate\_Process\_Error\_Rate(Employee\_ID, Time\_Window):

      Logs \= FETCH\_ALL\_TRANSACTIONS(Employee\_ID, Time\_Window)

      SET Total\_Transactions \= COUNT(Logs)

      SET Error\_Transactions \= 0

      FOR EACH Log IN Logs:

          // Lỗi bao gồm: Trả về làm sạch lại, Vi phạm vô khuẩn, Báo cáo thiếu hụt do cá nhân

          IF Log.Has\_Incident\_Report \== TRUE OR Log.Action \== "RETURNED\_FOR\_REWORK" THEN

              Error\_Transactions \= Error\_Transactions \+ 1

          END IF

      END FOR

      IF Total\_Transactions \== 0 THEN

          RETURN 0%

      ELSE

          RETURN (Error\_Transactions / Total\_Transactions) \* 100

      END IF

  END FUNCTION

// \----------------------------------------------------------------------------

// THUẬT TOÁN TÍNH TOÁN CHỈ SỐ VÒNG ĐỜI TÀI SẢN

// \----------------------------------------------------------------------------

\* TẦN SUẤT LUÂN CHUYỂN BỘ DỤNG CỤ:

  FUNCTION Calculate\_Turnover\_Frequency(Instrument\_Box\_ID, Time\_Window):

      SET Turnover\_Count \= 0

      Traceability\_Logs \= FETCH\_TRACEABILITY\_LOGS(Instrument\_Box\_ID, Time\_Window)

      FOR EACH Log IN Traceability\_Logs:

          // Một vòng luân chuyển hoàn thành khi dụng cụ được cấp phát thành công cho phòng mổ

          IF Log.Station \== "LUU\_KHO\_CAP\_PHAT" AND Log.Action \== "SCAN\_BAN\_GIAO\_PHONG\_MO" THEN

              Turnover\_Count \= Turnover\_Count \+ 1

          END IF

      END FOR

      RETURN Turnover\_Count

  END FUNCTION

\* TỶ LỆ HAO MÒN / THẤT THOÁT TRÊN TỪNG BỘ:

  FUNCTION Calculate\_Wear\_And\_Loss\_Rate(Instrument\_Template\_ID, Time\_Window):

      Template\_Data \= FETCH\_TEMPLATE(Instrument\_Template\_ID)

      SET Expected\_Total\_Items \= Template\_Data.Standard\_Quantity

      SET Lost\_Or\_Broken\_Items \= 0

      Incident\_Reports \= FETCH\_INCIDENT\_REPORTS(Instrument\_Template\_ID, Time\_Window)

      FOR EACH Report IN Incident\_Reports:

          IF Report.Type IN \["MISSING", "BROKEN", "END\_OF\_LIFECYCLE"\] THEN

              Lost\_Or\_Broken\_Items \= Lost\_Or\_Broken\_Items \+ Report.Quantity

          END IF

      END FOR

      IF Expected\_Total\_Items \== 0 THEN

          RETURN 0%

      ELSE

          RETURN (Lost\_Or\_Broken\_Items / Expected\_Total\_Items) \* 100

      END IF

  END FUNCTION

\* CHI PHÍ DUY TU BẢO DƯỠNG TRÊN MỖI THIẾT BỊ MÁY MÓC:

  FUNCTION Calculate\_Maintenance\_Cost(Machine\_ID, Time\_Window):

      SET Total\_Cost \= 0

      Maintenance\_Logs \= FETCH\_MAINTENANCE\_RECORDS(Machine\_ID, Time\_Window)

      FOR EACH Record IN Maintenance\_Logs:

          Cost\_Of\_Spare\_Parts \= SUM(Record.Replaced\_Parts.Cost)

          Service\_Fee \= Record.Service\_Fee

          Total\_Cost \= Total\_Cost \+ Cost\_Of\_Spare\_Parts \+ Service\_Fee

      END FOR

      RETURN Total\_Cost

  END FUNCTION

\--------------------------------------------------------------------------------

**Lược đồ Hệ thống Thẻ kho và Hậu cần Thiết bị**

{

  "$schema": "http://json-schema.org/draft-07/schema\#",

  "title": "HeThongTheKhoDienTu\_ModuleHauCan",

  "description": "Lược đồ JSON thiết kế cho Hệ thống thẻ kho điện tử thuộc Module Quản trị Kho và Thiết bị (Hậu cần).",

  "type": "object",

  "properties": {

    "VatTu": {

      "type": "array",

      "description": "Danh mục vật tư tiêu hao và lý lịch thiết bị máy móc.",

      "items": {

        "type": "object",

        "properties": {

          "ma\_vat\_tu": {

            "type": "string",

            "description": "Mã định danh duy nhất của vật tư hoặc thiết bị."

          },

          "ten\_vat\_tu": {

            "type": "string",

            "description": "Tên vật tư hoặc thiết bị máy móc."

          },

          "loai\_vat\_tu": {

            "type": "string",

            "enum": \[

              "Vat\_Tu\_Tieu\_Hao",

              "Thiet\_Bi\_May\_Moc"

            \],

            "description": "Phân loại nhóm tài sản."

          },

          "don\_vi\_tinh": {

            "type": "string",

            "description": "Đơn vị tính (Ví dụ: hộp, chiếc, máy)."

          },

          "nguong\_ton\_kho\_toi\_thieu": {

            "type": "integer",

            "description": "Ngưỡng tồn kho tối thiểu để hệ thống kích hoạt cảnh báo cận ngưỡng (Re-order level)."

          }

        },

        "required": \[

          "ma\_vat\_tu",

          "ten\_vat\_tu",

          "loai\_vat\_tu",

          "don\_vi\_tinh",

          "nguong\_ton\_kho\_toi\_thieu"

        \]

      }

    },

    "TheKho": {

      "type": "array",

      "description": "Lưu vết biến động số lượng vật tư theo giao dịch, tuân thủ nguyên tắc FEFO.",

      "items": {

        "type": "object",

        "properties": {

          "ma\_giao\_dich": {

            "type": "string",

            "description": "Mã giao dịch xuất/nhập kho duy nhất."

          },

          "ma\_vat\_tu": {

            "type": "string",

            "description": "Khóa ngoại liên kết với bảng VatTu."

          },

          "loai\_giao\_dich": {

            "type": "string",

            "enum": \[

              "Nhap\_Kho",

              "Xuat\_Kho"

            \],

            "description": "Phân loại giao dịch làm biến động số lượng."

          },

          "ngay\_giao\_dich": {

            "type": "string",

            "format": "date-time",

            "description": "Thời gian thực hiện giao dịch."

          },

          "so\_lo\_san\_xuat": {

            "type": "string",

            "description": "Số lô sản xuất (Batch) bắt buộc đi kèm mọi giao dịch nhập kho."

          },

          "han\_su\_dung": {

            "type": "string",

            "format": "date",

            "description": "Hạn sử dụng (Date) để thuật toán ưu tiên xuất kho theo nguyên tắc FEFO (Hết hạn trước \- Xuất trước)."

          },

          "so\_luong\_bien\_dong": {

            "type": "integer",

            "description": "Số lượng vật tư thay đổi trong giao dịch."

          },

          "so\_luong\_ton": {

            "type": "integer",

            "description": "Số lượng tồn kho cập nhật sau giao dịch."

          },

          "phieu\_lien\_thong": {

            "type": "string",

            "description": "Mã phiếu liên thông với module báo cáo hao mòn dụng cụ phẫu thuật."

          }

        },

        "required": \[

          "ma\_giao\_dich",

          "ma\_vat\_tu",

          "loai\_giao\_dich",

          "ngay\_giao\_dich",

          "so\_lo\_san\_xuat",

          "han\_su\_dung",

          "so\_luong\_bien\_dong",

          "so\_luong\_ton"

        \]

      }

    },

    "LichBaoDuong": {

      "type": "array",

      "description": "Bảng lịch trình theo dõi ngày bảo dưỡng máy móc và quản lý chi phí.",

      "items": {

        "type": "object",

        "properties": {

          "ma\_thiet\_bi": {

            "type": "string",

            "description": "Khóa ngoại liên kết với thiết bị trong bảng VatTu."

          },

          "ngay\_bao\_duong": {

            "type": "string",

            "format": "date",

            "description": "Ngày thực hiện chu kỳ bảo dưỡng phòng ngừa định kỳ hoặc sửa chữa."

          },

          "trang\_thai\_thiet\_bi": {

            "type": "string",

            "enum": \[

              "Hoat\_Dong",

              "Dang\_Sua\_Chua"

            \],

            "description": "Cờ trạng thái. Khi chuyển sang 'Đang sửa chữa', phần mềm sẽ tự động vô hiệu hóa máy khỏi danh sách lựa chọn vận hành."

          },

          "chi\_phi\_sua\_chua": {

            "type": "number",

            "description": "Chi phí thực hiện sửa chữa hoặc thay thế linh kiện."

          },

          "linh\_kien\_thay\_the": {

            "type": "array",

            "description": "Danh sách các vật tư, linh kiện đã được thay thế trong lần bảo dưỡng này.",

            "items": {

              "type": "string"

            }

          }

        },

        "required": \[

          "ma\_thiet\_bi",

          "ngay\_bao\_duong",

          "trang\_thai\_thiet\_bi",

          "chi\_phi\_sua\_chua"

        \]

      }

    }

  },

  "required": \[

    "VatTu",

    "TheKho",

    "LichBaoDuong"

  \]

}

\--------------------------------------------------------------------------------

**Cấu trúc Dữ liệu Biên bản và Quản trị Rủi ro CSSD**

{

  "$schema": "http://json-schema.org/draft-07/schema\#",

  "title": "BienBanDienTu\_QuanTriRuiRo",

  "description": "Lược đồ JSON tổng quát lưu trữ dữ liệu đầu vào cho Module Quản trị Rủi ro và Lập Biên bản điện tử (CSSD ERP) trước khi kết xuất PDF.",

  "type": "object",

  "properties": {

    "ThongTinBoiCanh": {

      "type": "object",

      "description": "Thông tin hành chính và bối cảnh lập biên bản.",

      "properties": {

        "loai\_bien\_ban": {

          "type": "string",

          "enum": \[

            "Bien\_Ban\_Su\_Co\_Ky\_Thuat",

            "Bien\_Ban\_Hao\_Mon\_Tai\_San",

            "Bien\_Ban\_Ban\_Giao"

          \],

          "description": "Phân loại biên bản điện tử cần kết xuất."

        },

        "thoi\_gian": {

          "type": "string",

          "format": "date-time",

          "description": "Thời gian hệ thống ghi nhận sự kiện (ISO 8601)."

        },

        "dia\_diem": {

          "type": "string",

          "description": "Vị trí vật lý phát sinh sự cố hoặc thực hiện bàn giao (VD: Phòng mổ số 3, Khu kiểm tra CSSD)."

        },

        "nguoi\_lap": {

          "type": "string",

          "description": "Mã định danh hoặc tên của nhân viên y tế/quản lý kho lập biên bản (trích xuất từ phiên đăng nhập)."

        }

      },

      "required": \[

        "loai\_bien\_ban",

        "thoi\_gian",

        "dia\_diem",

        "nguoi\_lap"

      \]

    },

    "ThongTinDoiTuong": {

      "type": "object",

      "description": "Thông tin định danh của tài sản, thiết bị hoặc hộp dụng cụ liên quan.",

      "properties": {

        "ma\_dinh\_danh": {

          "type": "string",

          "description": "Mã QR Code hoặc ID định danh vật lý duy nhất của tài sản/hộp dụng cụ."

        },

        "ten\_tai\_san": {

          "type": "string",

          "description": "Tên gọi của thiết bị máy móc hoặc bộ khuôn mẫu dụng cụ."

        },

        "loai\_tai\_san": {

          "type": "string",

          "enum": \[

            "Hop\_Dung\_Cu\_Phau\_Thuat",

            "Thiet\_Bi\_May\_Moc",

            "Vat\_Tu\_Tieu\_Hao"

          \],

          "description": "Phân loại nhóm tài sản chịu ảnh hưởng."

        }

      },

      "required": \[

        "ma\_dinh\_danh"

      \]

    },

    "ThongTinNghiepVu": {

      "type": "object",

      "description": "Chi tiết nghiệp vụ, bằng chứng hiện trường và quyết định điều hướng hệ thống.",

      "properties": {

        "mo\_ta\_su\_co": {

          "type": "string",

          "description": "Mô tả chi tiết tình trạng lỗi vô khuẩn, thiếu hụt, dị vật hoặc hỏng hóc thiết bị."

        },

        "hinh\_anh\_dinh\_kem": {

          "type": "array",

          "description": "Mảng chứa các URL hình ảnh chụp hiện trường bằng chứng.",

          "items": {

            "type": "string",

            "format": "uri"

          }

        },

        "phuong\_an\_xu\_ly": {

          "type": "object",

          "description": "Hành động khắc phục và điều hướng máy trạng thái (State Machine).",

          "properties": {

            "hanh\_dong\_khac\_phuc": {

              "type": "string",

              "description": "Mô tả giải pháp xử lý tại chỗ hoặc yêu cầu sửa chữa/bổ sung."

            },

            "lui\_ve\_tram\_vat\_ly": {

              "type": "string",

              "enum": \[

                "TAI\_PHONG\_MO",

                "TIEP\_NHAN\_DO\_BAN",

                "LAM\_SACH\_KHU\_KHUAN",

                "KIEM\_TRA\_BAO\_DUONG",

                "DONG\_GOI\_PHAN\_LOAI",

                "TIET\_KHUAN",

                "LUU\_KHO\_CAP\_PHAT",

                "KHOA\_AN\_TOAN",

                "KHONG\_AP\_DUNG"

              \],

              "description": "Trạng thái trạm vật lý mà hộp dụng cụ/thiết bị bị ép buộc lùi về (Rollback) theo thuật toán quản lý vòng đời CSSD."

            }

          },

          "required": \[

            "lui\_ve\_tram\_vat\_ly"

          \]

        }

      },

      "required": \[

        "mo\_ta\_su\_co",

        "phuong\_an\_xu\_ly"

      \]

    }

  },

  "required": \[

    "ThongTinBoiCanh",

    "ThongTinDoiTuong",

    "ThongTinNghiepVu"

  \]

}

\--------------------------------------------------------------------------------

**Kiến Trúc Thuật Toán Quản Trị Chu Trình CSSD ERP**

// \============================================================================

// KIẾN TRÚC HỆ THỐNG QUẢN TRỊ CSSD (CSSD ERP MASTER BLUEPRINT)

// THUẬT TOÁN MÁY TRẠNG THÁI (STATE MACHINE): VÒNG ĐỜI LUÂN CHUYỂN DỤNG CỤ ĐỊNH DANH

// NGÔN NGỮ: PSEUDOCODE

// \============================================================================

// \----------------------------------------------------------------------------

// 1\. ĐỊNH NGHĨA CÁC TRẠNG THÁI VẬT LÝ (PHYSICAL STATIONS) \[1, 2\]

// \----------------------------------------------------------------------------

ENUM Physical\_State {

    TAI\_PHONG\_MO,           // Đang sử dụng hoặc chờ thu gom tại Lâm sàng

    TIEP\_NHAN\_DO\_BAN,       // Chốt 1: Tiếp nhận đồ bẩn

    LAM\_SACH\_KHU\_KHUAN,     // Chốt 2: Làm sạch và khử khuẩn

    KIEM\_TRA\_BAO\_DUONG,     // Chốt 3: Kiểm tra và bảo dưỡng (Chốt chặn chất lượng)

    DONG\_GOI\_PHAN\_LOAI,     // Chốt 4: Đóng gói và phân loại nhiệt

    TIET\_KHUAN,             // Chốt 5: Tiệt khuẩn

    LUU\_KHO\_CAP\_PHAT,       // Chốt 6: Lưu kho và cấp phát

    KHOA\_AN\_TOAN            // Trạng thái Đóng băng (Frozen) do thiếu/hỏng

}

// \----------------------------------------------------------------------------

// 2\. ĐỊNH NGHĨA CẤU TRÚC ĐỐI TƯỢNG HỘP DỤNG CỤ (INSTRUMENT BOX OBJECT)

// \----------------------------------------------------------------------------

CLASS Instrument\_Box {

    STRING QRCode\_ID

    Physical\_State Current\_State

    BOOLEAN Is\_Heat\_Sensitive       // Cờ chịu nhiệt \[2\]

    BOOLEAN Is\_Locked               // Trạng thái khóa an toàn \[2\]

    ARRAY

 \--------------- 

\#\#\# Lộ trình Phát triển và Kiến trúc Hệ thống Kiểm soát Nhiễm khuẩn

**\============================================================================**

**PHÂN TÍCH KHOẢNG TRỐNG KIẾN TRÚC & YÊU CẦU PHÁT TRIỂN BỔ SUNG**

**Dựa trên: BRD, Kế hoạch triển khai (v4), Nhật ký yêu cầu và Cẩm nang kiến trúc**

**\============================================================================**

system\_readiness\_assessment: current\_state: frontend: "Next.js App Router, TailwindCSS, PWA Manifest, Login, Dashboard, AdministrativeHeader đã hoàn thiện (v1.0) \[1, 2\]." database: "Supabase/PostgreSQL, bảng core\_tables (departments, employees) và RLS đã khởi tạo \[3\]." hand\_hygiene: "Logic UI (Bỏ sót \-\> Lạm dụng găng tay) và giao diện Multi-Observation đã thiết kế \[4, 5\]." blockers: "Đang chờ kết nối CSDL Nội bộ (Docker Desktop) để bơm dữ liệu danh sự nhân sự và vận hành \[6\]."

missing\_components\_for\_comprehensive\_development:

* module: "Dynamic Checklist Engine (Động cơ Tự động sinh Logic Bảng Kiểm)" status: "Pending" reference: "Software\_Architecture\_Guide.md \[7\], BRD \[8, 9\]" requirements:  
  * task: "Xây dựng thuật toán Parser chuyển đổi file Excel (chứa danh mục, bảng kiểm, tiêu chí) thành định dạng JSON Schema \[8\]."  
  * task: "Phát triển Component Dynamic Form Renderer để tự động sinh giao diện nhập liệu (Có/Không/KAD) từ JSON Schema \[9\]."  
  * task: "Tích hợp tính năng đính kèm bằng chứng (Ảnh chụp hiện trường) và Ghi chú văn bản cho từng tiêu chí \[9\]."  
* module: "CSSD ERP Backend (Hệ thống Quản trị Dụng cụ Phẫu thuật)" status: "Pending" reference: "CSSD ERP Master Blueprint \[10-22\], BRD \[23\]" requirements:  
  * task: "Thiết kế CSDL theo mô hình Master-Instance Architecture (Khuôn mẫu vs Định danh vật lý có mã QR) \[16\]."  
  * task: "Xây dựng State Machine (Thuật toán Máy trạng thái) kiểm soát 6 chốt chặn vòng đời dụng cụ (Tiếp nhận \-\> Làm sạch \-\> Kiểm tra \-\> Đóng gói \-\> Tiệt khuẩn \-\> Cấp phát) \[11, 12\]."  
  * task: "Lập trình thuật toán 'Khóa an toàn' vô hiệu hóa mã QR của mẻ hấp khi Test Bowie-Dick/BI/CI không đạt \[12\]."  
  * task: "Phát triển module Hậu cần: Áp dụng nguyên tắc FEFO cho vật tư tiêu hao và theo dõi chu kỳ bảo dưỡng thiết bị \[14\]."  
* module: "HAI Surveillance AI Rules Engine (Động cơ thuật toán giám sát NKBV)" status: "Pending" reference: "BRD \[24-27\]" requirements:  
  * task: "Phát triển Background Jobs (Cron) chạy thuật toán phân định POA (Ngày 1-2) và HAI (Từ ngày 3\) \[24\]."  
  * task: "Lập trình thuật toán cửa sổ IWP (7 ngày) và thuật toán khóa trùng lặp RIT (14 ngày) để chặn cảnh báo lặp \[24\]."  
  * task: "Lập trình Luật luân chuyển (Transfer Rule) tự động gán trách nhiệm (Location of Attribution) về khoa gốc \[24\]."  
  * task: "Tích hợp thư viện Vi sinh (Microbiology Dictionary) để tự động phân loại LCBI 1, 2, 3 và MBI-LCBI \[27\]."  
* module: "Statistical & Export Engine (Động cơ Thống kê & Trích xuất)" status: "Pending" reference: "BRD \[28\]" requirements:  
  * task: "Lập trình thuật toán Data Flattening (Trải ngang dữ liệu) để xuất file Excel tương thích chuẩn 100% với SPSS/Stata \[28\]."  
  * task: "Tích hợp thư viện tính toán P-Value (Chi-square Test, Fisher's Exact Test) vào Dashboard để kiểm định ý nghĩa thống kê của tỷ lệ tuân thủ \[28\]."  
  * task: "Xây dựng hệ thống Cross-filter (Lọc chéo đa chiều) cho Dashboard \[28\]."  
  * task: "Cấu hình CSS Print (@media print) chuẩn khổ A4, tự động ép chiều cao biểu đồ và ẩn các phần tử UI thừa \[28, 29\]."  
* module: "HIS Integration Layer (Lớp tích hợp Hệ thống thông tin bệnh viện)" status: "Pending" reference: "Huong\_dan\_phat\_trien\_Kiem\_soat\_nhiem\_khuan.md \[30\]" requirements:  
  * task: "Viết tài liệu OpenAPI (Swagger) cho các RESTful/GraphQL Endpoints \[30\]."  
  * task: "Xây dựng luồng đồng bộ dữ liệu bệnh nhân (ADT: Nhập/Xuất/Chuyển khoa), chỉ số sinh tồn và kết quả cấy vi sinh từ HIS hiện tại của BV 103 \[30\]."  
* module: "Red Flag Webhook Trigger (Hệ thống cảnh báo đỏ)" status: "Pending" reference: "Huong\_Dan\_Phat\_Trien\_KSNK\_Dua\_Tren\_SRS.md \[31\], BRD \[32\]" requirements:  
  * task: "Phát triển Background Worker (Node.js/Python) lắng nghe sự kiện khi phiếu giám sát có tiêu chí 'is\_red\_flag: true' bị đánh giá 'Không đạt' \[31\]."  
  * task: "Tích hợp API gọi HTTP POST đến Webhook của Zalo OA hoặc Telegram Bot để gửi thông báo khẩn cấp cho Lãnh đạo \[31\]."

 \--------------- 

\#\#\# Hệ thống Bảng kiểm Giám sát Kiểm soát Nhiễm khuẩn

\[ { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ ICRA", "ma\_bang\_kiem": "BM.03.03", "danh\_sach\_tieu\_chi": \[ { "stt": "1.1", "noi\_dung\_cau\_hoi": "Rào chắn được duy trì nguyên vẹn, kín (sàn đến trần)?", "loai\_thang\_do": "C/K" }, { "stt": "1.2", "noi\_dung\_cau\_hoi": "Các khe hở, cửa ra vào đã được niêm phong?", "loai\_thang\_do": "C/K" }, { "stt": "1.3", "noi\_dung\_cau\_hoi": "Phòng đệm (nếu cấp IV) được duy trì và sử dụng đúng?", "loai\_thang\_do": "C/K" }, { "stt": "2.1", "noi\_dung\_cau\_hoi": "Máy lọc HEPA di động đang hoạt động?", "loai\_thang\_do": "C/K" }, { "stt": "2.2", "noi\_dung\_cau\_hoi": "Áp lực âm được duy trì (kiểm tra bằng khói hoặc đồng hồ)?", "loai\_thang\_do": "C/K" }, { "stt": "3.1", "noi\_dung\_cau\_hoi": "Có biển cảnh báo KHU VỰC THI CÔNG \- KHÔNG PHẬN SỰ MIỄN VÀO?", "loai\_thang\_do": "C/K" }, { "stt": "3.2", "noi\_dung\_cau\_hoi": "Thảm dính (nếu yêu cầu) được sử dụng và còn sạch?", "loai\_thang\_do": "C/K" }, { "stt": "4.1", "noi\_dung\_cau\_hoi": "Khu vực thi công được vệ sinh, giữ gọn gàng?", "loai\_thang\_do": "C/K" }, { "stt": "4.2", "noi\_dung\_cau\_hoi": "Chất thải, chất thải rắn xây dựng được che phủ khi vận chuyển ra ngoài?", "loai\_thang\_do": "C/K" }, { "stt": "4.3", "noi\_dung\_cau\_hoi": "Không phát hiện bụi bẩn thoát ra khu vực chăm sóc lân cận?", "loai\_thang\_do": "C/K" }, { "stt": "5.1", "noi\_dung\_cau\_hoi": "Công nhân không ăn uống, hút thuốc trong vùng can thiệp?", "loai\_thang\_do": "C/K" }, { "stt": "5.2", "noi\_dung\_cau\_hoi": "Công nhân tuân thủ quy định về PTPH/thay đồ?", "loai\_thang\_do": "C/K" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ VỆ SINH TAY (5 THỜI ĐIỂM)", "ma\_bang\_kiem": "BM.07.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Thời điểm 1 (TRƯỚC TX NB)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Thời điểm 2 (TRƯỚC làm thủ thuật)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Thời điểm 3 (SAU phơi nhiễm)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Thời điểm 4 (SAU TX NB)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Thời điểm 5 (SAU TX MT)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Phương tiện (Cồn/Xà phòng)", "loai\_thang\_do": "Text" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM ĐÁNH GIÁ KỸ THUẬT VST THƯỜNG QUY (6 BƯỚC)", "ma\_bang\_kiem": "BM.07.02", "danh\_sach\_tieu\_chi": \[ { "stt": "0", "noi\_dung\_cau\_hoi": "Tháo bỏ trang sức (nhẫn, đồng hồ).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "1", "noi\_dung\_cau\_hoi": "Lấy đủ lượng hóa chất/xà phòng.", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Bước 1: Chà 2 lòng bàn tay vào nhau.", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Bước 2: Chà lòng bàn tay này lên mu/kẽ ngón tay kia (và ngược lại).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Bước 3: Chà 2 lòng bàn tay vào nhau, miết mạnh các kẽ ngón tay.", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Bước 4: Chà mặt ngoài các ngón tay vào lòng bàn tay kia (và ngược lại).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Bước 5: Xoay ngón tay cái của tay này vào lòng bàn tay kia (và ngược lại).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Bước 6: Chụm 5 đầu ngón tay này xoay vào lòng bàn tay kia (và ngược lại).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "Thời gian: Đảm bảo đủ thời gian (20 \- 30s với cồn; 40-60s với xà phòng).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Chỉ áp dụng (Xà phòng): Lau khô tay bằng khăn/giấy 1 lần.", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "Chỉ áp dụng (Xà phòng): Dùng khăn/giấy để khóa vòi nước.", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM ĐÁNH GIÁ KỸ THUẬT VỆ SINH TAY NGOẠI KHOA", "ma\_bang\_kiem": "BM.07.03", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Tháo bỏ toàn bộ trang sức (nhẫn, đồng hồ, vòng).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Móng tay cắt ngắn, sạch, không sơn.", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Bước đệm (Làm sạch): Thực hiện VST thường quy (bằng xà phòng thường).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Bước đệm (Làm sạch móng): Dùng dụng cụ/chải mềm làm sạch dưới móng tay. Rửa sạch.", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Nếu Chà tay (Cồn): Lau thật khô tay và cẳng tay trước khi lấy cồn.", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Lấy đủ lượng hóa chất sát khuẩn (xà phòng hoặc cồn).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Thực hiện 6 bước VST cho bàn tay, chà kỹ kẽ ngón, đầu móng.", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "Chà tuần tự: Cổ tay → Cẳng tay (chia 3 phần) → Khuỷu tay (cho cả 2 tay).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Thời gian: Đảm bảo đủ tổng thời gian (3-5 phút cho Rửa; 1.5-3 phút cho Chà).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "Tư thế: Luôn giữ bàn tay cao hơn khuỷu tay trong suốt quá trình (và sau khi rửa).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "11", "noi\_dung\_cau\_hoi": "Nếu Rửa tay (Xà phòng): Rửa sạch dưới vòi nước (giữ tay cao).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "12", "noi\_dung\_cau\_hoi": "Nếu Rửa tay (Xà phòng): Lau khô bằng khăn vô khuẩn (lau từ ngón → khuỷu).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "13", "noi\_dung\_cau\_hoi": "Nếu Chà tay (Cồn): Lặp lại đủ số lần (nếu cần) và để khô tự nhiên, không lau.", "loai\_thang\_do": "C/K/KPH" }, { "stt": "14", "noi\_dung\_cau\_hoi": "Không tiếp xúc lại với các bề mặt không vô khuẩn sau khi VST.", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ CHỈ ĐỊNH (LỰA CHỌN) PTPH", "ma\_bang\_kiem": "BM.08.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Đánh giá sự phù hợp của PTPH NVYT sử dụng dựa trên tình huống và nguy cơ", "loai\_thang\_do": "Đ/S" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM ĐÁNH GIÁ KỸ THUẬT MẶC VÀ CỞI PTPH", "ma\_bang\_kiem": "BM.08.02", "danh\_sach\_tieu\_chi": \[ { "stt": "A.1", "noi\_dung\_cau\_hoi": "Vệ sinh tay (trước khi mặc).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "A.2", "noi\_dung\_cau\_hoi": "Mặc áo choàng (buộc dây cổ, dây lưng).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "A.3", "noi\_dung\_cau\_hoi": "Đeo khẩu trang (đúng loại, che mũi miệng, chỉnh gọng).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "A.4", "noi\_dung\_cau\_hoi": "Đeo kính/Mặt nạ (nếu có chỉ định).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "A.5", "noi\_dung\_cau\_hoi": "Đi găng tay (kéo găng trùm cổ tay áo).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "B.1", "noi\_dung\_cau\_hoi": "Cởi găng tay VÀ áo choàng (lộn trái, cuộn lại, không chạm mặt ngoài).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "B.2", "noi\_dung\_cau\_hoi": "Vệ sinh tay (NGAY SAU KHI CỞI GĂNG/ÁO).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "B.3", "noi\_dung\_cau\_hoi": "Cởi kính/Mặt nạ (cầm vào quai/gọng).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "B.4", "noi\_dung\_cau\_hoi": "Cởi khẩu trang (cầm dây, cởi từ sau, không chạm mặt ngoài).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "B.5", "noi\_dung\_cau\_hoi": "Vệ sinh tay (LẦN CUỐI, BẮT BUỘC).", "loai\_thang\_do": "C/K/KPH" }, { "stt": "B.6", "noi\_dung\_cau\_hoi": "Thải bỏ PTPH đúng thùng rác lây nhiễm.", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ THỰC HÀNH TIÊM AN TOÀN", "ma\_bang\_kiem": "BM.09.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Thực hiện vệ sinh tay trước khi chuẩn bị thuốc/dụng cụ", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Xe tiêm/khay tiêm sạch sẽ, gọn gàng", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Sát khuẩn nắp lọ thuốc bằng cồn 70º trước khi rút thuốc", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Sử dụng 1 bơm tiêm, 1 kim tiêm vô khuẩn cho 1 lần tiêm", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Không để kim tiêm cắm lưu trên nắp lọ thuốc đa liều", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Thực hiện vệ sinh tay trước khi tiêm cho người bệnh", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Mang găng tay (nếu có chỉ định)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "Sát khuẩn da vùng tiêm đúng kỹ thuật (xoắn ốc, chờ khô)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "KHÔNG đậy nắp kim tiêm bằng 2 tay", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "KHÔNG tháo rời kim tiêm hoặc bẻ cong kim bằng tay", "loai\_thang\_do": "C/K/KPH" }, { "stt": "11", "noi\_dung\_cau\_hoi": "Thải bỏ kim và bơm tiêm vào hộp kháng thủng NGAY LẬP TỨC", "loai\_thang\_do": "C/K/KPH" }, { "stt": "12", "noi\_dung\_cau\_hoi": "Hộp kháng thủng đặt đúng vị trí (trong tầm với, \< 1 sải tay)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "13", "noi\_dung\_cau\_hoi": "Hộp kháng thủng không bị đầy quá 3/4 (còn sử dụng được)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "14", "noi\_dung\_cau\_hoi": "Thực hiện vệ sinh tay sau khi kết thúc thủ thuật (sau tháo găng)", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ VỆ SINH MÔI TRƯỜNG", "ma\_bang\_kiem": "BM.11.01", "danh\_sach\_tieu\_chi": \[ { "stt": "A.1", "noi\_dung\_cau\_hoi": "NVVS mang đúng PTPH (găng tay, khẩu trang...)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "A.2", "noi\_dung\_cau\_hoi": "Xe VSMT sạch sẽ, đầy đủ dụng cụ, hóa chất?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "A.3", "noi\_dung\_cau\_hoi": "Hóa chất được pha và dán nhãn đúng (tên, nồng độ, ngày pha)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "A.4", "noi\_dung\_cau\_hoi": "Có đặt biển báo "Sàn ướt" khi lau sàn?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "A.5", "noi\_dung\_cau\_hoi": "Tuân thủ mã màu xô, giẻ lau (HD.11.02)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "A.6", "noi\_dung\_cau\_hoi": "Kỹ thuật lau đúng (Từ trên xuống, sạch đến bẩn, 1 chiều/ziczac)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "A.7", "noi\_dung\_cau\_hoi": "Không dùng chổi quét khô ở khu vực điều trị?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "A.8", "noi\_dung\_cau\_hoi": "Dụng cụ được vệ sinh, phơi khô sau khi sử dụng?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "B.1", "noi\_dung\_cau\_hoi": "Sàn nhà", "loai\_thang\_do": "C/K/KPH" }, { "stt": "B.2", "noi\_dung\_cau\_hoi": "Hành lang", "loai\_thang\_do": "C/K/KPH" }, { "stt": "B.3", "noi\_dung\_cau\_hoi": "Tay nắm cửa (Phòng bệnh/Toilet)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "B.4", "noi\_dung\_cau\_hoi": "Thanh chắn giường", "loai\_thang\_do": "C/K/KPH" }, { "stt": "B.5", "noi\_dung\_cau\_hoi": "Bàn đầu giường", "loai\_thang\_do": "C/K/KPH" }, { "stt": "B.6", "noi\_dung\_cau\_hoi": "Công tắc điện", "loai\_thang\_do": "C/K/KPH" }, { "stt": "B.7", "noi\_dung\_cau\_hoi": "Nút bấm thang máy / Tay vịn", "loai\_thang\_do": "C/K/KPH" }, { "stt": "B.8", "noi\_dung\_cau\_hoi": "Nhà vệ sinh (Bồn rửa, bồn cầu, sàn)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "C.1", "noi\_dung\_cau\_hoi": "Điều dưỡng có lau khử khuẩn thiết bị (ống nghe, huyết áp kế...) giữa các NB?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "C.2", "noi\_dung\_cau\_hoi": "Bề mặt monitor, bơm tiêm điện, máy thở (khu vực ĐD quản lý) có sạch không?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "C.3", "noi\_dung\_cau\_hoi": "ĐD có dùng đúng hóa chất (Cồn 70°/chất tương thích) cho thiết bị điện tử?", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM VỆ SINH MÔI TRƯỜNG KHU VỰC PHẪU THUẬT", "ma\_bang\_kiem": "BM.11.03", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Sàn nhà sạch (không rác, vết bẩn, tóc)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Tường sạch(không có vết bẩn văng bắn)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Cửa ra vào, tay nắm cửa sạch", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Bồn VST sạch (sạch, không đọng nước)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Đèn mổ sạch (không có bụi)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Bàn mổ sạch (mặt bàn, chân, bánh xe)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Bàn dụng cụ, xe đẩy sạch", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "Máy gây mê sạch (bảng điều khiển, vỏ máy, dây)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Monitor, máy hút, dao điện... sạch", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "Tủ/kệ đựng dụng cụ sạch", "loai\_thang\_do": "C/K/KPH" }, { "stt": "11", "noi\_dung\_cau\_hoi": "Nhân viên VSMT có mang PTPH?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "12", "noi\_dung\_cau\_hoi": "Có dùng đúng dụng cụ (màu đỏ) cho phòng mổ?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "13", "noi\_dung\_cau\_hoi": "Lau đúng kỹ thuật (sạch trước, bẩn sau, trên xuống)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "14", "noi\_dung\_cau\_hoi": "Có thu gom rác/đồ vải bẩn trước khi lau?", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUẢN LÝ CTYT", "ma\_bang\_kiem": "BM.12.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Có đủ 4 loại thùng/túi (Vàng, đen, xanh, trắng) tại vị trí quy định?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Thùng/túi đúng màu sắc, có biểu tượng/cảnh báo rõ ràng?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Thùng có nắp đậy (ưu tiên đạp chân), sạch sẽ, không rò rỉ?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Thùng VÀNG: Có chứa rác sinh hoạt/tái chế không? (Lỗi nghiêm trọng)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Thùng XANH: Có chứa rác lây nhiễm (bông gạc) không? (Lỗi nghiêm trọng)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Hộp sắc nhọn: Có sẵn, đúng vị trí, không đầy quá 3/4 vạch?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Hộp sắc nhọn: Có chứa rác khác (bông, vỏ kim...) không?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "NVVS có mang PTPH (găng tay, khẩu trang) khi thu gom?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Túi rác có được buộc chặt cổ túi trước khi vận chuyển?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "Hộp sắc nhọn có được khóa nắp an toàn khi vận chuyển (khi đầy)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "11", "noi\_dung\_cau\_hoi": "Rác có được thu gom đúng tần suất (không để \> 48h tại khoa)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "12", "noi\_dung\_cau\_hoi": "Thùng rác tại chỗ có được vệ sinh sau khi lấy túi?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "13", "noi\_dung\_cau\_hoi": "Xe vận chuyển có nắp đậy, kín, sạch sẽ, đúng loại?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "14", "noi\_dung\_cau\_hoi": "Vận chuyển đúng luồng, đúng giờ quy định?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "15", "noi\_dung\_cau\_hoi": "Khu lưu giữ tập trung có sạch sẽ, có khóa, có phân chia khu vực rõ ràng?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "16", "noi\_dung\_cau\_hoi": "Khu lưu giữ CTLN có đảm bảo thời gian (\<48h) hoặc có kho lạnh?", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ THU GOM ĐỒ VẢI", "ma\_bang\_kiem": "BM.13.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "NVYT có thực hiện phân loại ngay tại giường bệnh?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "NVYT có giũ đồ vải bẩn trong không khí không? (Lỗi nghiêm trọng)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Đồ vải lây nhiễm (dính máu/dịch) có được bỏ vào túi VÀNG không?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Đồ vải thông thường có được bỏ vào túi XANH không?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Có để đồ vải bẩn xuống sàn nhà/hành lang không?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "NV thu gom có mang PTPH (găng tay, tạp dề...) khi thu gom?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Túi đồ vải có bị đầy quá 3/4 không?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "Túi đồ vải có được buộc chặt miệng túi trước khi vận chuyển?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Xe vận chuyển đồ bẩn có kín, nắp đậy, dán nhãn "BẨN"?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "Xe vận chuyển đồ bẩn có sạch sẽ, không rò rỉ?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "11", "noi\_dung\_cau\_hoi": "Tủ/Xe lưu giữ đồ vải SẠCH tại khoa có kín, sạch sẽ, khô ráo?", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT QUY TRÌNH TẠI ĐƠN VỊ GIẶT LÀ", "ma\_bang\_kiem": "BM.13.02", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Có phân luồng một chiều (Bẩn → Sạch) rõ ràng?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Nhân viên khu bẩn có mang PTPH đầy đủ?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Đồ vải lây nhiễm (túi VÀNG) có được xử lý ưu tiên/xử lý riêng?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Nhân viên có giũ đồ vải khi phân loại không?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Khu vực bẩn có thông gió tốt (áp suất âm so với khu sạch)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Máy giặt có được nạp đúng tải trọng?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "(Giặt nhiệt): Nhiệt độ giặt có đạt ≥ 71°C? (Kiểm tra đồng hồ)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "(Giặt nhiệt): Thời gian giữ nhiệt có đạt ≥ 25 phút? (Kiểm tra cài đặt)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "(Giặt hóa chất): Hóa chất khử khuẩn có được cấp phát đúng nồng độ?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "Nhân viên khu sạch có mặc đồng phục sạch, vệ sinh tay?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "11", "noi\_dung\_cau\_hoi": "Đồ vải sau giặt có được kiểm tra (sạch, khô, không rách)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "12", "noi\_dung\_cau\_hoi": "Đồ vải sạch có được lưu giữ trong tủ/xe che đậy kín?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "13", "noi\_dung\_cau\_hoi": "Xe vận chuyển đồ sạch có dán nhãn "SẠCH", có che đậy?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "14", "noi\_dung\_cau\_hoi": "Có sử dụng chung xe vận chuyển BẨN và SẠCH không? (Lỗi nghiêm trọng)", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ PHÒNG NGỪA DỰA TRÊN ĐƯỜNG LÂY TRUYỀN", "ma\_bang\_kiem": "BM.14.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Có biển báo cách ly phù hợp treo bên ngoài cửa phòng", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Phòng bệnh bố trí phù hợp (Phòng riêng, ghép nhóm, AIIR...)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Cửa phòng bệnh được giữ đóng (Bắt buộc với giọt bắn/Không khí)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Có sẵn PTPH phù hợp (Găng, áo, KT y tế, KT N95) bên ngoài phòng", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Có sẵn phương tiện VST (cồn/bồn rửa) tại lối ra/vào", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Có sẵn thùng/túi chất thải lây nhiễm (vàng) trong phòng", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Thực hiện VST trước khi vào phòng và sau khi ra khỏi phòng", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "Mang ĐÚNG PTPH được yêu cầu trước khi vào phòng", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Tháo PTPH trước khi ra khỏi phòng (Trừ N95)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "Dụng cụ (ống nghe, HA kế...) được dùng riêng hoặc khử khuẩn", "loai\_thang\_do": "C/K/KPH" }, { "stt": "11", "noi\_dung\_cau\_hoi": "(Nếu là PN không khí) Mang khẩu trang N95, kiểm tra độ khít", "loai\_thang\_do": "C/K/KPH" }, { "stt": "12", "noi\_dung\_cau\_hoi": "Người bệnh được hướng dẫn, tuân thủ ở trong phòng", "loai\_thang\_do": "C/K/KPH" }, { "stt": "13", "noi\_dung\_cau\_hoi": "Người nhà/khách thăm được hướng dẫn và tuân thủ (nếu được phép)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "14", "noi\_dung\_cau\_hoi": "NB được đeo khẩu trang y tế khi vận chuyển (nếu có)", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ QUY TRÌNH VẬN CHUYỂN NGƯỜI BỆNH", "ma\_bang\_kiem": "BM.15.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Khoa giao đã thông báo/phối hợp với khoa nhận", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "NB được chuẩn bị đúng (băng kín vết thương, đeo khẩu trang nếu cần)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Phương tiện vận chuyển (xe/cáng) SẠCH trước khi đón NB", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "NVYT vận chuyển VST và mang PTPH đúng (nếu có chỉ định cách ly)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "NVYT hạn chế chạm tay (đặc biệt là tay có găng) vào môi trường (nút thang máy, cửa)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Di chuyển theo tuyến đường hợp lý, hạn chế tiếp xúc", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "NVYT tháo PTPH (nếu có) đúng cách, VST sau khi bàn giao NB", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "(QUAN TRỌNG) Phương tiện (xe/cáng) được lau khử khuẩn các bề mặt tiếp xúc ngay sau khi sử dụng.", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Phương tiện được cất giữ tại khu vực sạch, gọn gàng", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ KSNK TRONG XỬ LÝ TỬ THI", "ma\_bang\_kiem": "BM.16.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "NVYT (Điều dưỡng) có mang PTPH (găng tay, áo choàng, khẩu trang...) khi xử lý tử thi?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Các ống/dẫn lưu có được tháo gỡ cẩn thận?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Máu/dịch tiết có được lau sạch trước khi đóng gói?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Tử thi có được đặt vào túi đựng tử thi không thấm nước, kéo khóa kín?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Có dán nhãn nhận dạng bên ngoài túi?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Nếu có rò rỉ, có sử dụng túi thứ hai (double-bagging)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Khu vực giường bệnh có được VSMT (QT.KSNK.16) sau khi tử thi chuyển đi?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "Nhân viên vận chuyển (Nhà tang lễ) có mang PTPH?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Có sổ bàn giao (BM.16.02) giữa khoa và Nhà tang lễ ?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "Tử thi có được vận chuyển bằng xe đẩy chuyên dụng, có che đậy?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "11", "noi\_dung\_cau\_hoi": "Xe đẩy tử thi có được vệ sinh, khử khuẩn sau khi sử dụng?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "12", "noi\_dung\_cau\_hoi": "Tử thi có được bảo quản trong tủ lạnh chuyên dụng?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "13", "noi\_dung\_cau\_hoi": "Nhà tang lễ có sạch sẽ, được vệ sinh định kỳ?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "14", "noi\_dung\_cau\_hoi": "Tử thi bệnh truyền nhiễm nguy hiểm có được dán nhãn cảnh báo?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "15", "noi\_dung\_cau\_hoi": "Có được đóng gói kép?", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT MẶC/CỞI PTPH CẤP CAO", "ma\_bang\_kiem": "BM.17.01", "danh\_sach\_tieu\_chi": \[ { "stt": "I.1", "noi\_dung\_cau\_hoi": "Kiểm tra tính nguyên vẹn và đầy đủ của các phương tiện.", "loai\_thang\_do": "Đạt/Không đạt" }, { "stt": "I.2", "noi\_dung\_cau\_hoi": "Thực hiện vệ sinh tay đúng 06 bước.", "loai\_thang\_do": "Đạt/Không đạt" }, { "stt": "I.3", "noi\_dung\_cau\_hoi": "Mặc bộ liền quần (hoặc áo choàng) đúng kỹ thuật.", "loai\_thang\_do": "Đạt/Không đạt" }, { "stt": "I.4", "noi\_dung\_cau\_hoi": "Đeo khẩu trang N95, kiểm tra độ kín (Fit-check).", "loai\_thang\_do": "Đạt/Không đạt" }, { "stt": "I.5", "noi\_dung\_cau\_hoi": "Đeo kính bảo hộ hoặc tấm che mặt (ôm khít mặt).", "loai\_thang\_do": "Đạt/Không đạt" }, { "stt": "I.6", "noi\_dung\_cau\_hoi": "Đội mũ trùm đầu và đeo bao giày (nếu rời).", "loai\_thang\_do": "Đạt/Không đạt" }, { "stt": "I.7", "noi\_dung\_cau\_hoi": "Đeo găng tay y tế (phủ ngoài cổ tay áo bảo hộ).", "loai\_thang\_do": "Đạt/Không đạt" }, { "stt": "II.1", "noi\_dung\_cau\_hoi": "Tháo găng tay (không để mặt ngoài găng chạm vào da).", "loai\_thang\_do": "Đạt/Không đạt" }, { "stt": "II.2", "noi\_dung\_cau\_hoi": "Vệ sinh tay ngay sau khi tháo găng.", "loai\_thang\_do": "Đạt/Không đạt" }, { "stt": "II.3", "noi\_dung\_cau\_hoi": "Tháo bộ liền quần (cuộn từ trong ra ngoài, không vẩy mạnh).", "loai\_thang\_do": "Đạt/Không đạt" }, { "stt": "II.4", "noi\_dung\_cau\_hoi": "Vệ sinh tay sau khi tháo bộ liền quần.", "loai\_thang\_do": "Đạt/Không đạt" }, { "stt": "II.5", "noi\_dung\_cau\_hoi": "Tháo kính/tấm che mặt (cầm dây phía sau, không chạm mặt trước).", "loai\_thang\_do": "Đạt/Không đạt" }, { "stt": "II.6", "noi\_dung\_cau\_hoi": "Vệ sinh tay sau khi tháo kính/tấm che.", "loai\_thang\_do": "Đạt/Không đạt" }, { "stt": "II.7", "noi\_dung\_cau\_hoi": "Tháo khẩu trang tại khu vực đệm (không chạm mặt trước khẩu trang).", "loai\_thang\_do": "Đạt/Không đạt" }, { "stt": "II.8", "noi\_dung\_cau\_hoi": "Vệ sinh tay ngay sau khi tháo khẩu trang.", "loai\_thang\_do": "Đạt/Không đạt" }, { "stt": "II.9", "noi\_dung\_cau\_hoi": "Tháo mũ/bao giày (nếu có) và bỏ vào thùng rác lây nhiễm.", "loai\_thang\_do": "Đạt/Không đạt" }, { "stt": "II.10", "noi\_dung\_cau\_hoi": "Vệ sinh tay lần cuối trước khi rời khu vực đệm.", "loai\_thang\_do": "Đạt/Không đạt" }, { "stt": "II.11", "noi\_dung\_cau\_hoi": "Thực hiện vệ sinh cá nhân (tắm, thay quần áo sạch).", "loai\_thang\_do": "Đạt/Không đạt" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT QUY TRÌNH LÀM SẠCH", "ma\_bang\_kiem": "BM.18.02", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Nhân viên mang đầy đủ PTPH (tạp dề, găng cao su dày, kính/mặt nạ, ủng)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Khu vực rửa sạch sẽ, sắp xếp gọn gàng, áp suất âm?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Dụng cụ được tháo rời tối đa các bộ phận trước khi ngâm?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Dung dịch Enzyme pha đúng nồng độ và nhiệt độ nước ấm (30-45°C)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Dụng cụ được ngâm ngập hoàn toàn (bơm đầy lòng ống)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Thực hiện cọ rửa dưới mặt nước (không văng bắn)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Có sử dụng chổi cọ nòng chuyên dụng cho các dụng cụ có lòng ống?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "Dụng cụ được xả sạch hóa chất dưới vòi nước chảy (nước RO)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Dụng cụ được làm khô (khí nén/khăn/tủ sấy) trước khi chuyển đi?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "Có thực hiện kiểm tra độ sạch (dưới kính lúp) sau khi rửa?", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ KKMĐC NỘI SOI", "ma\_bang\_kiem": "BM.19.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Nhân viên có mang PTPH đầy đủ (kính/tấm che mặt, găng tay kháng hóa chất, áo chống thấm) khi làm sạch?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Khu vực bẩn và sạch có tách biệt, tuân thủ một chiều?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Khu vực ngâm hóa chất KKMĐC có thông khí tốt? Bồn ngâm có nắp đậy?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Có thực hiện kiểm tra rò rỉ cho mọi ống soi trước khi ngâm?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Hóa chất enzyme (Bồn 1\) có được pha và thay đúng quy định?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "(Quan trọng): Nhân viên có dùng bàn chải nòng (đúng cỡ) cọ rửa TẤT CẢ các kênh?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Các van, nút có được tháo rời và cọ rửa kỹ?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "Dụng cụ có được xả sạch enzyme (Bồn 2\) trước khi KKMĐC?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "(Ngâm tay): Có kiểm tra nồng độ (MEC) bằng que thử trước khi ngâm?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "(Ngâm tay): Có đảm bảo ngâm ngập và bơm đầy hóa chất vào các kênh?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "11", "noi\_dung\_cau\_hoi": "(Ngâm tay): Có dùng đồng hồ hẹn giờ và tuân thủ đúng thời gian ngâm?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "12", "noi\_dung\_cau\_hoi": "(Chạy máy): Có kết nối đúng các kênh vào máy AER?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "13", "noi\_dung\_cau\_hoi": "Dụng cụ có được xả sạch hóa chất bằng nước (vô khuẩn/lọc)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "14", "noi\_dung\_cau\_hoi": "Các kênh có được làm khô (bằng cồn 70° và khí nén y tế)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "15", "noi\_dung\_cau\_hoi": "Dụng cụ được lưu giữ (treo dọc) trong tủ chuyên dụng, sạch sẽ?", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ ĐÓNG GÓI DỤNG CỤ", "ma\_bang\_kiem": "BM.20.02", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Nhân viên mang trang phục sạch (mũ, áo, khẩu trang) và VST?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Khu vực đóng gói sạch sẽ, duy trì áp suất dương, cửa đóng kín?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Dụng cụ được kiểm tra độ sạch, khô, nguyên vẹn trước khi gói?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Sắp xếp dụng cụ đúng danh mục, bảo vệ đầu sắc nhọn?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Đặt chỉ thị hóa học (CI) bên trong đúng vị trí (chỗ khó nhất)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Lựa chọn vật liệu đóng gói tương thích với phương pháp tiệt khuẩn?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Kỹ thuật gói (gói kép) hoặc ép túi (đường hàn phẳng, kín) đúng quy cách?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "Dán nhãn đầy đủ (Tên, Ngày, Mẻ, người gói) và chỉ thị bên ngoài?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Xếp dụng cụ vào máy đúng kỹ thuật (nghiêng, không quá tải)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "Tuân thủ thời gian làm nguội (cooling) trước khi dỡ tải?", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ LƯU TRỮ", "ma\_bang\_kiem": "BM.21.04", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Khu vực/Tủ lưu trữ có sạch, khô, không bám bụi?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Có được vệ sinh định kỳ (sàn, tường, kệ tủ)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Tủ/Kệ có đóng kín? (Nếu là kệ hở, dụng cụ có được che đậy?)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Vị trí lưu trữ có xa nguồn nước/bồn rửa, xa khu vực bẩn?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Dụng cụ được đặt trên kệ/tủ đảm bảo khoảng cách (sàn \> 20cm, trần \> 45cm)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "(CSSD): Khu vô khuẩn có áp suất dương? Nhiệt độ/Độ ẩm đạt chuẩn?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Các gói dụng cụ có được sắp xếp gọn gàng, không bị chèn ép, chồng chất?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "Các gói nặng (container) có được đặt ở kệ dưới?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Có tuân thủ nguyên tắc FIFO (hàng cũ ra trước) và FEFO (hết hạn ra trước)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "Các gói dụng cụ có nhãn mác rõ ràng (tên, ngày TK, mẻ...)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "11", "noi\_dung\_cau\_hoi": "Không có dụng cụ quá hạn sử dụng (nếu áp dụng TRSL) trong kho?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "12", "noi\_dung\_cau\_hoi": "(CSSD): Việc cấp phát có thực hiện qua cửa sổ, có sổ sách giao nhận?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "13", "noi\_dung\_cau\_hoi": "(CSSD): Dụng cụ có được vận chuyển bằng xe/thùng kín, sạch chuyên dụng?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "14", "noi\_dung\_cau\_hoi": "(Tại khoa): Nhân viên có kiểm tra 4 yếu tố (loại, HSD, chỉ thị, bao gói) trước khi dùng?", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ QC TIỆT KHUẨN", "ma\_bang\_kiem": "BM.22.04", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Có thực hiện Test Bowie-Dick (lò tiệt khuẩn hơi nước chân không) vào mẻ đầu ngày không?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Test B-D có được đặt đúng vị trí (giá dưới, gần cửa thoát)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Sổ theo dõi B-D có được dán tờ test và ghi kết quả đầy đủ?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Có đặt gói thử nghiệm (PCD) chứa CI Loại 5 vào mỗi mẻ tiệt khuẩn không?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Gói thử nghiệm CI có được đặt đúng vị trí (khó tiệt khuẩn nhất)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Có đặt BI theo đúng tần suất (Tối thiểu 1 lần/tuần, 100% mẻ cấy ghép)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Sổ theo dõi BI có ghi chép đầy đủ? Lọ đối chứng có dương tính?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "Hồ sơ mẻ có được lưu đầy đủ (kẹp bản in vật lý, kết quả CI/BI)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Các mẻ cấy ghép có được lưu giữ, chờ kết quả BI âm tính trước khi cấp phát?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "Khi có sự cố (B-D hỏng, BI dương tính), có thực hiện cách ly/thu hồi mẻ?", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM AN TOÀN PHẪU THUẬT", "ma\_bang\_kiem": "BM.24.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Tên NB, tuổi?", "loai\_thang\_do": "Checked" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Vị trí phẫu thuật?", "loai\_thang\_do": "Checked" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Loại phẫu thuật?", "loai\_thang\_do": "Checked" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Đã ký cam kết phẫu thuật?", "loai\_thang\_do": "Checked" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Đã đánh dấu vị trí mổ (nếu cần)?", "loai\_thang\_do": "Checked" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Kiểm tra máy gây mê, thuốc, đường truyền?", "loai\_thang\_do": "Checked" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Kiểm tra máy đo SpO2 (đang hoạt động)?", "loai\_thang\_do": "Checked" }, { "stt": "8", "noi\_dung\_cau\_hoi": "NB có dị ứng? (Có/Không)", "loai\_thang\_do": "Checked" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Nguy cơ đường thở khó/hít sặc? (Có/Không)", "loai\_thang\_do": "Checked" }, { "stt": "10", "noi\_dung\_cau\_hoi": "Nguy cơ mất máu \> 500ml? (Có/Không)", "loai\_thang\_do": "Checked" }, { "stt": "11", "noi\_dung\_cau\_hoi": "NB đã được sàng lọc/khử khuẩn S. aureus (nếu có chỉ định)? (Có/Không/KPH)", "loai\_thang\_do": "Checked" }, { "stt": "12", "noi\_dung\_cau\_hoi": "Mọi người tự giới thiệu tên, vai trò.", "loai\_thang\_do": "Checked" }, { "stt": "13", "noi\_dung\_cau\_hoi": "Xác nhận lại Tên NB, vị trí mổ, Loại phẫu thuật.", "loai\_thang\_do": "Checked" }, { "stt": "14", "noi\_dung\_cau\_hoi": "Các bước quan trọng hoặc nguy cơ?", "loai\_thang\_do": "Checked" }, { "stt": "15", "noi\_dung\_cau\_hoi": "Thời gian mổ dự kiến?", "loai\_thang\_do": "Checked" }, { "stt": "16", "noi\_dung\_cau\_hoi": "Lượng máu mất dự kiến?", "loai\_thang\_do": "Checked" }, { "stt": "17", "noi\_dung\_cau\_hoi": "NB có vấn đề gì đặc biệt?", "loai\_thang\_do": "Checked" }, { "stt": "18", "noi\_dung\_cau\_hoi": "Đã kiểm tra dụng cụ, chỉ thị tiệt khuẩn?", "loai\_thang\_do": "Checked" }, { "stt": "19", "noi\_dung\_cau\_hoi": "Có vấn đề gì về dụng cụ, vật tư?", "loai\_thang\_do": "Checked" }, { "stt": "20", "noi\_dung\_cau\_hoi": "Kháng sinh dự phòng ĐÃ TIÊM trong vòng 60-120 phút? (Có/Không/KPH)", "loai\_thang\_do": "Checked" }, { "stt": "21", "noi\_dung\_cau\_hoi": "Da sát khuẩn đã chờ khô? (Có)", "loai\_thang\_do": "Checked" }, { "stt": "22", "noi\_dung\_cau\_hoi": "Tên phẫu thuật đã thực hiện (ghi hồ sơ)?", "loai\_thang\_do": "Checked" }, { "stt": "23", "noi\_dung\_cau\_hoi": "Đếm gạc, dụng cụ, kim khâu (ĐÚNG, ĐỦ)?", "loai\_thang\_do": "Checked" }, { "stt": "24", "noi\_dung\_cau\_hoi": "Dán nhãn bệnh phẩm (nếu có)?", "loai\_thang\_do": "Checked" }, { "stt": "25", "noi\_dung\_cau\_hoi": "Có vấn đề gì về dụng cụ cần báo cáo?", "loai\_thang\_do": "Checked" }, { "stt": "26", "noi\_dung\_cau\_hoi": "Các vấn đề chính cần theo dõi (chăm sóc hậu phẫu, hồi tỉnh)?", "loai\_thang\_do": "Checked" }, { "stt": "27", "noi\_dung\_cau\_hoi": "Vết mổ đã được băng kín bằng gạc vô khuẩn?", "loai\_thang\_do": "Checked" }, { "stt": "28", "noi\_dung\_cau\_hoi": "Có kế hoạch duy trì Oxy (FiO2) tại hồi tỉnh? (Có/KPH)", "loai\_thang\_do": "Checked" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI PHÒNG NGỪA SSI", "ma\_bang\_kiem": "BM.24.02", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "NB được sàng lọc/khử khuẩn S. aureus (cho phẫu thuật nguy cơ cao)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "NB được tắm bằng xà phòng (thường/kháng khuẩn) trước mổ", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "NB KHÔNG bị cạo lông (bằng dao cạo) tại vùng mổ", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "KSDP được tiêm trong vòng 60-120 phút trước rạch da", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Đường huyết NB được kiểm soát tốt (\<180-200 mg/dL)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Kíp mổ tuân thủ VST ngoại khoa (đủ thời gian, kỹ thuật)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Da NB được sát khuẩn bằng dung dịch chứa cồn (ưu tiên)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "Chờ da sát khuẩn KHÔ HOÀN TOÀN trước khi rạch da", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Môi trường OR được kiểm soát (cửa đóng, hạn chế ra vào)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "Có bổ sung liều KSDP (nếu mổ kéo dài \> 2 T1/2 hoặc mất máu \> 1500ml)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "11", "noi\_dung\_cau\_hoi": "NB được duy trì thân nhiệt (\> 36°C)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "12", "noi\_dung\_cau\_hoi": "NB được duy trì FiO2 \> 80% (nếu thở máy)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "13", "noi\_dung\_cau\_hoi": "Vết mổ được băng kín, giữ khô trong 24-48 giờ đầu", "loai\_thang\_do": "C/K/KPH" }, { "stt": "14", "noi\_dung\_cau\_hoi": "NVYT tuân thủ VST và kỹ thuật vô khuẩn khi thay băng", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM AN TOÀN ĐẶT CATHETER TĨNH MẠCH TRUNG TÂM", "ma\_bang\_kiem": "BM.25.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Vệ sinh tay trước thủ thuật?", "loai\_thang\_do": "Đạt/Không" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Hàng rào vô khuẩn tối đa? (Mũ, khẩu trang, áo choàng, găng vô khuẩn, săng vô khuẩn lớn)", "loai\_thang\_do": "Đạt/Không" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Sát khuẩn da bằng Chlorhexidine (Cồn)?", "loai\_thang\_do": "Đạt/Không" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Da khô hoàn toàn trước khi chọc kim?", "loai\_thang\_do": "Đạt/Không" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Băng kín vô khuẩn sau khi đặt?", "loai\_thang\_do": "Đạt/Không" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI BẢO DƯỠNG (CHĂM SÓC) CVC", "ma\_bang\_kiem": "BM.25.03", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Đánh giá rút CVC hàng ngày? (Hồ sơ)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "VST trước và sau khi chạm CVC? (Quan sát)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Khử khuẩn cổng kết nối (5-15s)? (Quan sát)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Băng CVC sạch, khô, kín? (Quan sát)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Băng/Dây truyền thay đúng hạn? (Hồ sơ/ Nhãn)", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI PHÒNG NGỪA VAP", "ma\_bang\_kiem": "BM.26.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Nâng đầu giường 30-45°? (Quan sát)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "VSRM (đánh răng) 2-3 lần? (Hồ sơ/Phiếu CS)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Đánh giá SAT (thức tỉnh)? (Hồ sơ/Y lệnh)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Đánh giá SBT (tự thở)? (Hồ sơ/Y lệnh)", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Dây thở/Bẫy nước sạch, không đọng? (Quan sát)", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ GÓI PHÒNG NGỪA CAUTI", "ma\_bang\_kiem": "BM.27.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Có chỉ định rõ ràng TRONG HỒ SƠ?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Đánh giá lại chỉ định rút trong 24h qua?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Hệ thống có KÍN (Không ngắt kết nối)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Túi dẫn lưu THẤP hơn bàng quang?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Túi KHÔNG chạm sàn?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Vệ sinh vùng sinh dục (Nước+Xà phòng) trong ca?", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ KSNK TẠI PHÒNG MỔ", "ma\_bang\_kiem": "BM.QĐ.02.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Cửa phòng mổ đóng kín trong khi mổ?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Nhiệt độ, độ ẩm trong giới hạn cho phép (20-24°C, 30-60%)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Sàn nhà, bề mặt sạch sẽ, không bụi bẩn, không vết máu cũ?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Có đủ phương tiện VST (cồn, xà phòng, khăn lau tay)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Tuân thủ trang phục (mũ trùm tóc, khẩu trang che mũi)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Không đeo trang sức (nhẫn, vòng, đồng hồ)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Thực hiện VST ngoại khoa đúng quy trình (thời gian, kỹ thuật)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "Tuân thủ kỹ thuật vô khuẩn khi mặc áo, mang găng?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Hạn chế đi lại, nói chuyện, ra vào phòng mổ?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "NB đã được tắm vệ sinh, thay áo choàng sạch, đội mũ?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "11", "noi\_dung\_cau\_hoi": "NB đã tháo bỏ trang sức, răng giả, tẩy sơn móng?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "12", "noi\_dung\_cau\_hoi": "Vùng da mổ không bị trầy xước do cạo lông bằng dao?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "13", "noi\_dung\_cau\_hoi": "Sát khuẩn da NB đúng kỹ thuật và chờ khô?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "14", "noi\_dung\_cau\_hoi": "Dụng cụ, gạc, vật tư được kiểm tra hạn dùng, chỉ thị màu?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "15", "noi\_dung\_cau\_hoi": "Phân loại chất thải đúng quy định ngay tại nguồn?", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ TẠI CATHLAB", "ma\_bang\_kiem": "BM.QĐ.03.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Cửa phòng can thiệp đóng kín trong khi làm thủ thuật?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Sàn nhà, bề mặt máy sạch sẽ, không bụi, không vết máu?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Nhân viên tuân thủ trang phục (mũ, khẩu trang, quần áo sạch)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Thực hiện VST ngoại khoa đúng quy trình trước khi mặc áo vô khuẩn?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "NB được tắm/vệ sinh vùng chọc mạch sạch sẽ?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Không cạo lông bằng dao cạo (dùng tông đơ nếu cần)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Sát khuẩn da bằng dung dịch cồn và CHỜ KHÔ?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "Trải săng vô khuẩn che kín toàn thân NB?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Che phủ vô khuẩn các thiết bị máy (bảng điều khiển, bóng)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "Áo chì được treo đúng quy định (không gấp)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "11", "noi\_dung\_cau\_hoi": "Áo chì sạch sẽ, không có mùi hôi, không vết bẩn?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "12", "noi\_dung\_cau\_hoi": "Dụng cụ can thiệp dùng 1 lần (hoặc tiệt khuẩn đúng quy định)?", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ MÔI TRƯỜNG BẢO VỆ (PE)", "ma\_bang\_kiem": "BM.QĐ.09.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "NB được xếp phòng riêng (hoặc phòng áp suất dương, nếu có)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Cửa phòng bệnh có luôn đóng kín?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Có biển báo "Môi trường bảo vệ" / "Hạn chế ra vào" ngoài cửa?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "KHÔNG có hoa tươi, cây cảnh trong phòng bệnh?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Khách thăm có được sàng lọc (không ho/sốt) và hạn chế số lượng?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Khách thăm có VST và mang khẩu trang khi vào phòng?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "NVYT có VST (cồn/xà phòng) trước và sau khi vào phòng?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "NVYT có mang khẩu trang (và PTPH khác nếu cần) khi chăm sóc?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "VSMT (bề mặt, sàn) được thực hiện tăng cường (ít nhất 2 lần/ngày)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "NB có tuân thủ "Chế độ ăn an toàn" (ăn chín, uống sôi)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "11", "noi\_dung\_cau\_hoi": "NB có mang khẩu trang y tế khi bắt buộc phải ra khỏi phòng?", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT VỆ SINH LỒNG ẤP / GIƯỜNG SƯỞI", "ma\_bang\_kiem": "BM.QĐ.12.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Lau sạch bụi bề mặt ngoài lồng ấp?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Lau khử khuẩn tay cầm cửa sổ lồng ấp?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Lau khử khuẩn màn hình điều khiển, nút bấm?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Sử dụng khăn sạch và hóa chất đúng nồng độ?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Tháo rời các bộ phận (đệm, khay nước) để cọ rửa?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Lau khử khuẩn toàn bộ mặt trong lồng ấp?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Thay nước bình làm ẩm (nếu có) bằng nước vô khuẩn?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "Lồng ấp được để khô hoàn toàn trước khi dùng cho NB mới?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Dán nhãn "ĐÃ VỆ SINH" sau khi hoàn tất?", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT KSNK TẠI ĐƠN VỊ LỌC MÁU", "ma\_bang\_kiem": "BM.QĐ.13.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Có khu vực/phòng riêng cho NB Viêm gan B (HBsAg+)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Máy thận cho NB HBsAg(+) có dán nhãn cảnh báo rõ ràng?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Khoảng cách giữa các giường bệnh đảm bảo (\> 1m)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Có bồn VST, đủ xà phòng, khăn giấy, cồn sát khuẩn?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "NVYT thay găng và VST khi chuyển giữa các NB?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Không dùng chung khay dụng cụ/xe thuốc giữa các NB?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Sát khuẩn vùng chọc kim đúng kỹ thuật và chờ khô?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "Sát khuẩn cổng kết nối (hub) trước khi tiêm thuốc?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Chuẩn bị thuốc tại khu vực sạch (không tại giường bệnh)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "Máy thận được lau khử khuẩn sạch sẽ giữa 2 ca lọc?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "11", "noi\_dung\_cau\_hoi": "Không có vết máu loang lổ trên máy/ghế sau khi kết thúc ca?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "12", "noi\_dung\_cau\_hoi": "Chất thải lây nhiễm được phân loại đúng vào thùng vàng?", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ KSNK TẠI NHA KHOA", "ma\_bang\_kiem": "BM.QĐ.14.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Có đủ phương tiện VST (bồn, xà phòng, khăn giấy, cồn) tại mỗi ghế?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "NVYT thực hiện VST trước/sau mỗi NB và khi thay găng?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Đeo găng tay mới cho mỗi NB?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Đeo kính bảo hộ/tấm che mặt khi làm thủ thuật văng bắn?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Tay khoan được tiệt khuẩn (đóng gói, có chỉ thị màu) cho mỗi NB?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Các mũi khoan, trâm nội nha được tiệt khuẩn/dùng 1 lần?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Không ngâm tay khoan trong hóa chất khử khuẩn (thay vì tiệt khuẩn)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "Bề mặt ghế nha (đèn, bàn phím) được lau khử khuẩn/thay màng bọc sau mỗi ca?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Có thực hiện xả đường ống nước đầu ngày (2 phút) và giữa ca (30s)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "Ly súc miệng, ống hút nước bọt là loại dùng 1 lần?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "11", "noi\_dung\_cau\_hoi": "Chất thải sắc nhọn (kim tê, kim khâu) được bỏ ngay vào hộp vàng?", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT AN TOÀN TẠI PHÒNG NỘI SOI", "ma\_bang\_kiem": "BM.QĐ.15.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "NVYT có mang đầy đủ PTPH (Găng, áo, khẩu trang, KÍNH)?", "loai\_thang\_do": "Đ/K" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Có thực hiện VST trước và sau thủ thuật?", "loai\_thang\_do": "Đ/K" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Có thực hiện “Xử lý ban đầu” (lau/hút enzyme) ngay tại giường?", "loai\_thang\_do": "Đ/K" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Ống soi bẩn được vận chuyển trong hộp/thùng kín?", "loai\_thang\_do": "Đ/K" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Giường/Máy/Bàn phím được lau khử khuẩn sau mỗi ca?", "loai\_thang\_do": "Đ/K" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Không dùng chung bơm tiêm/lọ thuốc đa liều cho nhiều NB?", "loai\_thang\_do": "Đ/K" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Bình nước làm ẩm được thay hàng ngày (hoặc mỗi ca)?", "loai\_thang\_do": "Đ/K" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT TUÂN THỦ AN TOÀN SINH HỌC", "ma\_bang\_kiem": "BM.QĐ.16.01", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "NVYT có mặc áo choàng blouse kín đáo khi làm việc?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "NVYT có mang găng tay khi xử lý mẫu?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Không ăn uống, hút thuốc, để vật dụng cá nhân trên bàn XN?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Có thực hiện VST trước khi rời phòng XN?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Không mặc áo choàng XN ra ngoài khu vực làm việc?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Tủ BSC hoạt động tốt, còn hạn kiểm định?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Các thao tác tạo khí dung có được thực hiện trong BSC?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "Có sẵn bộ xử lý tràn đổ (Spill Kit) tại chỗ?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Máy ly tâm có nắp đậy an toàn (safety cup)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "Chất thải lây nhiễm (bệnh phẩm) được bỏ vào thùng vàng?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "11", "noi\_dung\_cau\_hoi": "Vật sắc nhọn được bỏ ngay vào hộp kháng thủng?", "loai\_thang\_do": "C/K/KPH" } \] }, { "ten\_bang\_kiem": "BẢNG KIỂM GIÁM SÁT VỆ SINH BẾP ĂN", "ma\_bang\_kiem": "BM.QĐ.18.02", "danh\_sach\_tieu\_chi": \[ { "stt": "1", "noi\_dung\_cau\_hoi": "Nhân viên có mặc đồng phục sạch, mũ trùm tóc?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "2", "noi\_dung\_cau\_hoi": "Nhân viên có đeo khẩu trang khi chế biến/chia thức ăn?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "3", "noi\_dung\_cau\_hoi": "Móng tay cắt ngắn, không đeo trang sức?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "4", "noi\_dung\_cau\_hoi": "Có thực hiện VST trước khi chế biến và sau khi đi vệ sinh?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "5", "noi\_dung\_cau\_hoi": "Có mang găng tay sạch khi chia thức ăn chín?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "6", "noi\_dung\_cau\_hoi": "Bếp được bố trí theo quy tắc một chiều (Sống → Chín)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "7", "noi\_dung\_cau\_hoi": "Khu vực chia thức ăn chín sạch sẽ, có lưới chống côn trùng?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "8", "noi\_dung\_cau\_hoi": "Có phân biệt Dao/Thớt dùng cho thực phẩm sống và chín (theo màu/ký hiệu)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "9", "noi\_dung\_cau\_hoi": "Tủ lạnh bảo quản thực phẩm sạch, sắp xếp ngăn nắp (Chín trên/Sống dưới)?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "10", "noi\_dung\_cau\_hoi": "Thùng rác có nắp đậy kín, không bốc mùi?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "11", "noi\_dung\_cau\_hoi": "Có thực hiện lưu mẫu thức ăn đầy đủ các món trong ngày?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "12", "noi\_dung\_cau\_hoi": "Sổ lưu mẫu ghi chép đầy đủ thông tin?", "loai\_thang\_do": "C/K/KPH" }, { "stt": "13", "noi\_dung\_cau\_hoi": "Xe vận chuyển suất ăn sạch sẽ, che đậy kín?", "loai\_thang\_do": "C/K/KPH" } \] } \]

 \--------------- 

\#\#\# Kiến trúc và Thuật toán Hệ thống Giám sát Y tế

**\============================================================================**

**TỔNG HỢP CÁC THÀNH PHẦN KIẾN TRÚC CẦN PHÁT TRIỂN BỔ SUNG**

**Tham chiếu: Bản đặc tả yêu cầu nghiệp vụ (BRD) \[1-4\]**

**\============================================================================**

missing\_development\_components:

* module\_1: "Thuật toán Trích xuất và Trải ngang Dữ liệu (Data Flattening Algorithm) phục vụ xuất tệp tương thích SPSS/Stata \[4\]."  
* module\_2: "Thuật toán Đồng bộ hóa Ngoại tuyến (Offline-First Sync Logic) sử dụng IndexedDB cho vùng mất sóng \[1\]."  
* module\_3: "Thuật toán Kích hoạt Cảnh báo Đỏ (Red Flag Webhook Trigger) sử dụng Background Worker gửi tin nhắn Zalo/Telegram \[3, 5\]."  
* module\_4: "Cấu hình Phân quyền Đa tầng (RBAC \- Row Level Security) kiểm soát tầm nhìn dữ liệu theo Khoa \[2\]."  
* module\_5: "Thuật toán Lọc dữ liệu liên hoàn (Cascading Dropdown) cho thông tin Hành chính \[1, 6\]."

// \============================================================================ // THUẬT TOÁN TRẢI NGANG DỮ LIỆU (DATA FLATTENING) \- SPSS/STATA EXPORT // ÁP DỤNG: PHÂN HỆ GIÁM SÁT VỆ SINH TAY (WHO) \[4\] // \============================================================================

FUNCTION Flatten\_Hand\_Hygiene\_Data(JSON\_Data\_Input): // Khởi tạo bảng dữ liệu phẳng để chứa các bản ghi CREATE Flat\_Data\_Table AS EMPTY ARRAY

// Định nghĩa 5 thời điểm chuẩn để biến đổi thành các cột nhị phân \[7\]

CONSTANT Standard\_Moments \= \["T-TXNB", "T-TTVK", "S-DCT", "S-TXNB", "S-XQNB"\]

FOR EACH Session IN JSON\_Data\_Input:

    // Trích xuất siêu dữ liệu của phiên giám sát

    Extract Metadata:

        Session\_Time \= Session.Metadata.thoi\_gian\_bat\_dau

        Khoa\_ID \= Session.Metadata.khoa\_id

        Observer \= Session.Metadata.nguoi\_giam\_sat

    FOR EACH Observation IN Session.Observations:

        Subject\_Role \= Observation.nhom\_doi\_tuong

        Subject\_Name \= Observation.ten\_dich\_danh

        FOR EACH Opportunity IN Observation.Opportunities:

            // Khởi tạo một dòng dữ liệu (Row) độc lập cho MỖI CƠ HỘI VST \[4\]

            CREATE Flat\_Row AS NEW DICTIONARY

            // 1\. Gắn dữ liệu hành chính

            Flat\_Row\["Thoi\_Gian"\] \= Session\_Time

            Flat\_Row\["Khoa\_Phong"\] \= Khoa\_ID

            Flat\_Row\["Nguoi\_Giam\_Sat"\] \= Observer

            Flat\_Row\["Nhom\_Doi\_Tuong"\] \= Subject\_Role

            Flat\_Row\["Doi\_Tuong\_Giam\_Sat"\] \= Subject\_Name

            // 2\. Chuyển đổi mảng "Thời điểm chỉ định" thành 5 cột Binary (0 và 1\) \[4\]

            FOR EACH Moment IN Standard\_Moments:

                IF Opportunity.thoi\_diem\_chi\_dinh CONTAINS Moment THEN

                    Flat\_Row\[Moment\] \= 1

                ELSE

                    Flat\_Row\[Moment\] \= 0

                END IF

            END FOR

            // 3\. Gắn dữ liệu hành động và tuân thủ \[7\]

            Flat\_Row\["Hanh\_Dong\_VST"\] \= Opportunity.hanh\_dong\_vst

            // Xử lý giá trị NULL/N/A dựa trên logic phân nhánh của hành động

            IF Opportunity.hanh\_dong\_vst \== "BO\_SOT" THEN

                Flat\_Row\["Dung\_Ky\_Thuat"\] \= NULL

                Flat\_Row\["Du\_Thoi\_Gian"\] \= NULL

                Flat\_Row\["Lam\_Dung\_Gang\_Tay"\] \= IF Opportunity.lam\_dung\_gang\_tay \== TRUE THEN 1 ELSE 0

            ELSE

                Flat\_Row\["Dung\_Ky\_Thuat"\] \= IF Opportunity.dung\_ky\_thuat \== TRUE THEN 1 ELSE 0

                Flat\_Row\["Du\_Thoi\_Gian"\] \= IF Opportunity.du\_thoi\_gian \== TRUE THEN 1 ELSE 0

                Flat\_Row\["Lam\_Dung\_Gang\_Tay"\] \= NULL

            END IF

            // Đẩy dòng dữ liệu đã trải ngang vào Bảng kết quả tổng

            APPEND Flat\_Row TO Flat\_Data\_Table

        END FOR

    END FOR

END FOR

// Trích xuất ra định dạng tệp tương thích với SPSS/Stata \[4\]

RETURN Export\_To\_CSV\_Format(Flat\_Data\_Table)

END FUNCTION

// \============================================================================ // THUẬT TOÁN ĐỒNG BỘ NGOẠI TUYẾN (OFFLINE-FIRST PWA) \[1\] // \============================================================================

FUNCTION Submit\_Surveillance\_Form(Form\_Payload): IF System.Network\_Status \== "ONLINE" THEN TRY: Response \= Database.Insert(Form\_Payload) IF Response.Is\_Success THEN RETURN "Lưu thành công lên Máy chủ" END IF CATCH ERROR: // Rớt mạng giữa chừng, lưu tạm vào IndexedDB IndexedDB.Save(Form\_Payload, Sync\_Status="PENDING") RETURN "Đã lưu vào bộ nhớ đệm thiết bị" ELSE // Khu vực hoàn toàn mất sóng (Offline) \[1\] IndexedDB.Save(Form\_Payload, Sync\_Status="PENDING") RETURN "Đã lưu vào bộ nhớ đệm thiết bị" END IF END FUNCTION

// Trình lắng nghe sự kiện khôi phục kết nối mạng \[1\] EVENT\_LISTENER On\_Network\_Restored(): Pending\_Data \= IndexedDB.Get\_All(Sync\_Status="PENDING") FOR EACH Record IN Pending\_Data: Response \= Database.Insert(Record.Payload) IF Response.Is\_Success THEN IndexedDB.Delete(Record.ID) END IF END FOR

**\============================================================================**

**CẤU HÌNH BẢO MẬT & PHÂN QUYỀN ĐA TẦNG (RBAC) \[2\]**

**\============================================================================**

role\_based\_access\_control: Admin\_He\_Thong: permissions: \["READ", "WRITE", "UPDATE", "DELETE", "BACKUP"\] scope: "Toàn quyền can thiệp CSDL \[2\]"

Lanh\_Dao\_Khoa\_KSNK: permissions: \["READ", "APPROVE\_HAI"\] scope: "Toàn bộ báo cáo, bảng điều khiển thống kê tổng thể toàn viện \[2\]"

Truong\_Khoa\_Lam\_Sang: permissions: \["READ"\] scope: "Chỉ giới hạn xem báo cáo, tỷ lệ tuân thủ, lỗi vi phạm trong phạm vi mã Khoa của mình \[2\]" rls\_policy: "department\_id \= auth.jwt().department\_id"

Giam\_Sat\_Vien\_KSNK: permissions: \["READ", "WRITE"\] scope: "Thực hiện nhập liệu đánh giá, không có quyền truy cập bảng điều khiển thống kê tổng \[2\]" rls\_policy: "created\_by \= auth.uid()"

 \--------------- 

\#\#\# Lược đồ Giám sát Thực hành Tiêm An toàn

{ "$schema": "http://json-schema.org/draft-07/schema\#", "title": "BangKiemGiamSatThucHanhTiemAnToan", "description": "Lược đồ JSON thiết kế phẳng (Flat Structure) cho Bảng kiểm giám sát thực hành tiêm an toàn (BM.09.01). Các câu hỏi được ánh xạ trực tiếp thành các thuộc tính của đối tượng thay vì sử dụng mảng.", "type": "object", "properties": { "Metadata": { "type": "object", "properties": { "thoi\_gian": { "type": "string", "format": "date-time" }, "khoa\_phong": { "type": "string" }, "nguoi\_giam\_sat": { "type": "string" }, "doi\_tuong\_giam\_sat": { "type": "string", "enum": \[ "Bác sĩ", "Điều dưỡng", "KTV", "Học viên" \] }, "loai\_thu\_thuat": { "type": "string", "enum": \[ "Tiêm (TB/TDD/TM)", "Lấy máu", "Truyền dịch" \] } }, "required": \[ "thoi\_gian", "khoa\_phong", "nguoi\_giam\_sat", "doi\_tuong\_giam\_sat", "loai\_thu\_thuat" \] }, "Phan\_A\_Chuan\_Bi": { "type": "object", "properties": { "ve\_sinh\_tay\_truoc\_chuan\_bi": { "type": "object", "properties": { "noi\_dung\_cau\_hoi": { "type": "string", "const": "Thực hiện vệ sinh tay trước khi chuẩn bị thuốc/dụng cụ" }, "loai\_thang\_do": { "type": "string", "enum": \[ "Dat", "KhongDat", "KhongApDung" \] }, "is\_red\_flag": { "type": "boolean", "const": false } }, "required": \[ "noi\_dung\_cau\_hoi", "loai\_thang\_do", "is\_red\_flag" \] }, "xe\_tiem\_sach\_se": { "type": "object", "properties": { "noi\_dung\_cau\_hoi": { "type": "string", "const": "Xe tiêm/khay tiêm sạch sẽ, gọn gàng" }, "loai\_thang\_do": { "type": "string", "enum": \[ "Dat", "KhongDat", "KhongApDung" \] }, "is\_red\_flag": { "type": "boolean", "const": false } }, "required": \[ "noi\_dung\_cau\_hoi", "loai\_thang\_do", "is\_red\_flag" \] }, "sat\_khuan\_nap\_lo\_thuoc": { "type": "object", "properties": { "noi\_dung\_cau\_hoi": { "type": "string", "const": "Sát khuẩn nắp lọ thuốc bằng cồn 70º trước khi rút thuốc" }, "loai\_thang\_do": { "type": "string", "enum": \[ "Dat", "KhongDat", "KhongApDung" \] }, "is\_red\_flag": { "type": "boolean", "const": true } }, "required": \[ "noi\_dung\_cau\_hoi", "loai\_thang\_do", "is\_red\_flag" \] }, "dung\_cu\_vo\_khuan": { "type": "object", "properties": { "noi\_dung\_cau\_hoi": { "type": "string", "const": "Sử dụng 1 bơm tiêm, 1 kim tiêm vô khuẩn cho 1 lần tiêm" }, "loai\_thang\_do": { "type": "string", "enum": \[ "Dat", "KhongDat", "KhongApDung" \] }, "is\_red\_flag": { "type": "boolean", "const": true } }, "required": \[ "noi\_dung\_cau\_hoi", "loai\_thang\_do", "is\_red\_flag" \] }, "khong\_luu\_kim\_tren\_lo\_da\_lieu": { "type": "object", "properties": { "noi\_dung\_cau\_hoi": { "type": "string", "const": "Không để kim tiêm cắm lưu trên nắp lọ thuốc đa liều" }, "loai\_thang\_do": { "type": "string", "enum": \[ "Dat", "KhongDat", "KhongApDung" \] }, "is\_red\_flag": { "type": "boolean", "const": true } }, "required": \[ "noi\_dung\_cau\_hoi", "loai\_thang\_do", "is\_red\_flag" \] } } }, "Phan\_B\_Thuc\_Hien": { "type": "object", "properties": { "ve\_sinh\_tay\_truoc\_tiem": { "type": "object", "properties": { "noi\_dung\_cau\_hoi": { "type": "string", "const": "Thực hiện vệ sinh tay trước khi tiêm cho người bệnh" }, "loai\_thang\_do": { "type": "string", "enum": \[ "Dat", "KhongDat", "KhongApDung" \] }, "is\_red\_flag": { "type": "boolean", "const": false } }, "required": \[ "noi\_dung\_cau\_hoi", "loai\_thang\_do", "is\_red\_flag" \] }, "mang\_gang\_tay": { "type": "object", "properties": { "noi\_dung\_cau\_hoi": { "type": "string", "const": "Mang găng tay (nếu có chỉ định)" }, "loai\_thang\_do": { "type": "string", "enum": \[ "Dat", "KhongDat", "KhongApDung" \] }, "is\_red\_flag": { "type": "boolean", "const": false } }, "required": \[ "noi\_dung\_cau\_hoi", "loai\_thang\_do", "is\_red\_flag" \] }, "sat\_khuan\_da\_vung\_tiem": { "type": "object", "properties": { "noi\_dung\_cau\_hoi": { "type": "string", "const": "Sát khuẩn da vùng tiêm đúng kỹ thuật (xoắn ốc, chờ khô)" }, "loai\_thang\_do": { "type": "string", "enum": \[ "Dat", "KhongDat", "KhongApDung" \] }, "is\_red\_flag": { "type": "boolean", "const": false } }, "required": \[ "noi\_dung\_cau\_hoi", "loai\_thang\_do", "is\_red\_flag" \] } } }, "Phan\_C\_Ket\_Thuc": { "type": "object", "properties": { "khong\_day\_nap\_kim\_2\_tay": { "type": "object", "properties": { "noi\_dung\_cau\_hoi": { "type": "string", "const": "KHÔNG đậy nắp kim tiêm bằng 2 tay" }, "loai\_thang\_do": { "type": "string", "enum": \[ "Dat", "KhongDat", "KhongApDung" \] }, "is\_red\_flag": { "type": "boolean", "const": true } }, "required": \[ "noi\_dung\_cau\_hoi", "loai\_thang\_do", "is\_red\_flag" \] }, "khong\_thao\_roi\_be\_cong\_kim": { "type": "object", "properties": { "noi\_dung\_cau\_hoi": { "type": "string", "const": "KHÔNG tháo rời kim tiêm hoặc bẻ cong kim bằng tay" }, "loai\_thang\_do": { "type": "string", "enum": \[ "Dat", "KhongDat", "KhongApDung" \] }, "is\_red\_flag": { "type": "boolean", "const": true } }, "required": \[ "noi\_dung\_cau\_hoi", "loai\_thang\_do", "is\_red\_flag" \] }, "thai\_bo\_ngay\_vao\_hop\_khang\_thung": { "type": "object", "properties": { "noi\_dung\_cau\_hoi": { "type": "string", "const": "Thải bỏ kim và bơm tiêm vào hộp kháng thủng NGAY LẬP TỨC" }, "loai\_thang\_do": { "type": "string", "enum": \[ "Dat", "KhongDat", "KhongApDung" \] }, "is\_red\_flag": { "type": "boolean", "const": true } }, "required": \[ "noi\_dung\_cau\_hoi", "loai\_thang\_do", "is\_red\_flag" \] }, "vi\_tri\_hop\_khang\_thung": { "type": "object", "properties": { "noi\_dung\_cau\_hoi": { "type": "string", "const": "Hộp kháng thủng đặt đúng vị trí (trong tầm với, \< 1 sải tay)" }, "loai\_thang\_do": { "type": "string", "enum": \[ "Dat", "KhongDat", "KhongApDung" \] }, "is\_red\_flag": { "type": "boolean", "const": true } }, "required": \[ "noi\_dung\_cau\_hoi", "loai\_thang\_do", "is\_red\_flag" \] }, "tinh\_trang\_hop\_khang\_thung": { "type": "object", "properties": { "noi\_dung\_cau\_hoi": { "type": "string", "const": "Hộp kháng thủng không bị đầy quá 3/4 (còn sử dụng được)" }, "loai\_thang\_do": { "type": "string", "enum": \[ "Dat", "KhongDat", "KhongApDung" \] }, "is\_red\_flag": { "type": "boolean", "const": true } }, "required": \[ "noi\_dung\_cau\_hoi", "loai\_thang\_do", "is\_red\_flag" \] }, "ve\_sinh\_tay\_sau\_thu\_thuat": { "type": "object", "properties": { "noi\_dung\_cau\_hoi": { "type": "string", "const": "Thực hiện vệ sinh tay sau khi kết thúc thủ thuật (sau tháo găng)" }, "loai\_thang\_do": { "type": "string", "enum": \[ "Dat", "KhongDat", "KhongApDung" \] }, "is\_red\_flag": { "type": "boolean", "const": false } }, "required": \[ "noi\_dung\_cau\_hoi", "loai\_thang\_do", "is\_red\_flag" \] } } }, "HanhDongKhacPhuc": { "type": "string", "description": "Ghi chú hoặc hành động khắc phục tại chỗ" } }, "required": \[ "Metadata", "Phan\_A\_Chuan\_Bi", "Phan\_B\_Thuc\_Hien", "Phan\_C\_Ket\_Thuc" \] }

 \--------------- 

\#\#\# Thuật toán Phân loại và Quy kết Nhiễm khuẩn NHSN

// \============================================================================ // HỆ THỐNG HỖ TRỢ RA QUYẾT ĐỊNH (DSS) \- KSNK // MODULE: THUẬT TOÁN KHUNG THỜI GIAN & QUY KẾT NHIỄM KHUẨN (TIMEFRAMES & SBSI) // TIÊU CHUẨN: CDC/NHSN 2023 (CHƯƠNG 2\) // NGÔN NGỮ: PSEUDOCODE // \============================================================================

// \---------------------------------------------------------------------------- // HÀM 1: XÁC ĐỊNH GIAI ĐOẠN CỬA SỔ (IWP) VÀ NGÀY SỰ KIỆN (DOE) // LƯU Ý: Không áp dụng IWP cho SSI, VAE, PedVAE, LabID. // \---------------------------------------------------------------------------- FUNCTION Calculate\_IWP\_and\_DOE(Patient\_Data, Event\_Type): IF Event\_Type IN \["SSI", "VAE", "PedVAE", "LabID"\] THEN RETURN "NOT\_APPLICABLE\_FOR\_IWP" END IF

// 1\. Xác định Ngày neo (Anchor Date) dựa trên chẩn đoán

IF Patient\_Data.Has\_Diagnostic\_Test \== TRUE THEN

    Anchor\_Date \= Patient\_Data.First\_Diagnostic\_Test\_Date // Ví dụ: Ngày cấy vi sinh, ngày chụp X-Quang

ELSE

    Anchor\_Date \= Patient\_Data.First\_Localized\_Symptom\_Date // Ví dụ: Ngày bắt đầu có mủ, đau khu trú (Không dùng triệu chứng toàn thân như Sốt)

END IF

// 2\. Tính toán Giai đoạn cửa sổ (IWP) \= 7 ngày (Ngày neo ± 3 ngày)

// Ngoại lệ: Viêm nội tâm mạc (ENDO) có IWP là 21 ngày (Ngày neo ± 10 ngày)

IF Event\_Type \== "ENDO" THEN

    IWP\_Start \= Anchor\_Date \- 10\_Days

    IWP\_End \= Anchor\_Date \+ 10\_Days

ELSE

    IWP\_Start \= Anchor\_Date \- 3\_Days

    IWP\_End \= Anchor\_Date \+ 3\_Days

END IF

// 3\. Xác định Ngày sự kiện (Date of Event \- DOE)

// DOE là ngày ĐẦU TIÊN xuất hiện BẤT KỲ yếu tố nào (triệu chứng hoặc xét nghiệm) thuộc tiêu chuẩn chẩn đoán nằm trong IWP.

DOE \= Find\_Earliest\_Element\_Date\_Within\_Window(Patient\_Data.Diagnostic\_Elements, IWP\_Start, IWP\_End)

RETURN {

    "IWP\_Start": IWP\_Start,

    "IWP\_End": IWP\_End,

    "DOE": DOE

}

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 2: PHÂN LOẠI NHIỄM KHUẨN LÚC NHẬP VIỆN (POA) VS NHIỄM KHUẨN BỆNH VIỆN (HAI) // \---------------------------------------------------------------------------- FUNCTION Determine\_POA\_vs\_HAI(DOE, Admission\_Date): // Ngày nhập viện luôn được tính là Hospital Day 1 (HD 1\) Hospital\_Day\_Of\_DOE \= (DOE \- Admission\_Date) \+ 1\_Day

// Quy tắc POA: Sự kiện xảy ra trong khoảng từ 2 ngày trước nhập viện đến Ngày thứ 2 của đợt nằm viện

IF (DOE \&gt;= Admission\_Date \- 2\_Days) AND (Hospital\_Day\_Of\_DOE \&lt;= 2\_Days) THEN

    RETURN "POA" // Present on Admission (Hiện diện lúc nhập viện)

END IF

// Quy tắc HAI: Sự kiện xảy ra từ Ngày thứ 3 của đợt nằm viện trở đi

IF Hospital\_Day\_Of\_DOE \&gt;= 3\_Days THEN

    RETURN "HAI" // Healthcare-Associated Infection (Nhiễm khuẩn bệnh viện)

END IF

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 3: XỬ LÝ SỰ KIỆN NHIỄM KHUẨN LẦN 2 DỰA TRÊN KHUNG THỜI GIAN LẶP LẠI (RIT) // MỤC ĐÍCH: Ngăn chặn hệ thống báo cáo trùng lặp cùng một ca bệnh. // \---------------------------------------------------------------------------- FUNCTION Check\_Repeat\_Infection\_Timeframe(New\_Event, Existing\_Events\_List): IF New\_Event.Event\_Type IN \["SSI", "VAE", "PedVAE", "LabID"\] THEN RETURN "NO\_RIT\_APPLICABLE" // Các loại NKBV này không dùng luật RIT END IF

FOR EACH Primary\_Event IN Existing\_Events\_List:

    // Đảm bảo cùng loại nhiễm khuẩn (Ví dụ: UTI so với UTI, PNEU so với PNEU)

    IF New\_Event.Major\_Infection\_Type \== Primary\_Event.Major\_Infection\_Type THEN

        // Tính toán Khung thời gian RIT 14 ngày (DOE là Ngày 1\)

        // Ngoại lệ: ENDO có RIT kéo dài đến hết đợt nằm viện hiện tại

        IF Primary\_Event.Event\_Type \== "ENDO" THEN

            RIT\_Start \= Primary\_Event.DOE

            RIT\_End \= Patient.Discharge\_Date

        ELSE

            RIT\_Start \= Primary\_Event.DOE

            RIT\_End \= Primary\_Event.DOE \+ 13\_Days

        END IF

        // Nếu DOE của ca nghi ngờ thứ 2 rơi vào trong RIT của ca thứ 1

        IF New\_Event.DOE \&gt;= RIT\_Start AND New\_Event.DOE \&lt;= RIT\_End THEN

            // Quy tắc gộp (Merge): KHÔNG tạo ca bệnh mới.

            // Nếu cấy ra vi khuẩn mới trong RIT, gộp vi khuẩn đó vào ca bệnh gốc.

            Append\_New\_Pathogens(Primary\_Event, New\_Event.Pathogens)

            // Không thay đổi Ngày sự kiện (DOE), Nơi quy kết (LOA), hay Thiết bị liên quan.

            RETURN {

                "Status": "DUPLICATE\_WITHIN\_RIT",

                "Action": "MERGE\_PATHOGENS\_TO\_PRIMARY\_EVENT",

                "Primary\_Event\_ID": Primary\_Event.ID

            }

        END IF

    END IF

END FOR

RETURN "NEW\_INFECTION\_EVENT" // Ngoài khung 14 ngày \-\&gt; Được ghi nhận là ca nhiễm khuẩn mới

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 4: CHẨN ĐOÁN NHIỄM KHUẨN HUYẾT THỨ PHÁT (SECONDARY BSI / SBSI) & SBAP // MỤC ĐÍCH: Phân biệt BSI nguyên phát (CLABSI) hay thứ phát từ ổ viêm khác. // \---------------------------------------------------------------------------- FUNCTION Determine\_Secondary\_BSI(Blood\_Culture, Primary\_Infection\_List): Blood\_Draw\_Date \= Blood\_Culture.Collection\_Date

FOR EACH Primary\_Infection IN Primary\_Infection\_List:

    // 1\. Tính toán Khung thời gian quy kết NKH thứ phát (SBAP)

    // SBAP \= IWP \+ RIT (Kéo dài từ 14 đến 17 ngày tùy thuộc vào DOE nằm ở đâu trong IWP)

    // Ngoại lệ SBAP của SSI: Kéo dài 17 ngày (Ngày DOE của SSI, 3 ngày trước và 13 ngày sau)

    IF Primary\_Infection.Event\_Type \== "SSI" THEN

        SBAP\_Start \= Primary\_Infection.DOE \- 3\_Days

        SBAP\_End \= Primary\_Infection.DOE \+ 13\_Days

    ELSE IF Primary\_Infection.Event\_Type \== "ENDO" THEN

        SBAP\_Start \= Primary\_Infection.IWP\_Start

        SBAP\_End \= Patient.Discharge\_Date

    ELSE

        SBAP\_Start \= Primary\_Infection.IWP\_Start

        SBAP\_End \= Primary\_Infection.DOE \+ 13\_Days // Tức là RIT\_End

    END IF

    // KIỂM TRA KỊCH BẢN 1:

    // Lấy máu trong SBAP VÀ CÓ ÍT NHẤT 1 chủng vi khuẩn trùng khớp với ổ tiên phát

    IF Blood\_Draw\_Date \&gt;= SBAP\_Start AND Blood\_Draw\_Date \&lt;= SBAP\_End THEN

        IF Has\_Matching\_Organism(Blood\_Culture.Pathogens, Primary\_Infection.Site\_Specific\_Pathogens) \== TRUE THEN

            RETURN {

                "Status": "SECONDARY\_BSI",

                "Matched\_Primary\_Event\_ID": Primary\_Infection.ID,

                "Scenario": "Scenario\_1\_Matched\_Organism\_In\_SBAP"

            }

        END IF

        // Xử lý Ngoại lệ cho Viêm ruột hoại tử (NEC) \- Không có bệnh phẩm tại chỗ để so sánh

        IF Primary\_Infection.Event\_Type \== "NEC" THEN

            IF Blood\_Culture.Is\_Recognized\_Pathogen \== TRUE OR Blood\_Culture.Common\_Commensal\_Matched\_Samples \&gt;= 2 THEN

                 RETURN {

                    "Status": "SECONDARY\_BSI",

                    "Matched\_Primary\_Event\_ID": Primary\_Infection.ID,

                    "Scenario": "Scenario\_1\_NEC\_Exception"

                }

            END IF

        END IF

    END IF

    // KIỂM TRA KỊCH BẢN 2:

    // Vi khuẩn trong máu là một YẾU TỐ bắt buộc để chẩn đoán ca tiên phát VÀ Lấy máu trong IWP

    // (Ví dụ: IAB tiêu chuẩn 3b, PNU2 cấy máu dương tính...)

    IF Blood\_Draw\_Date \&gt;= Primary\_Infection.IWP\_Start AND Blood\_Draw\_Date \&lt;= Primary\_Infection.IWP\_End THEN

        IF Is\_Blood\_Culture\_An\_Element\_Of\_Diagnosis(Primary\_Infection.Criteria, Blood\_Culture) \== TRUE THEN

            RETURN {

                "Status": "SECONDARY\_BSI",

                "Matched\_Primary\_Event\_ID": Primary\_Infection.ID,

                "Scenario": "Scenario\_2\_Blood\_Culture\_Is\_Diagnostic\_Element\_In\_IWP"

            }

        END IF

    END IF

END FOR

// Nếu KHÔNG rơi vào bất kỳ kịch bản và ổ nhiễm khuẩn tiên phát nào \-\&gt; Nó là BSI Nguyên phát

RETURN {

    "Status": "PRIMARY\_BSI",

    "Action": "EVALUATE\_FOR\_CLABSI"

}

END FUNCTION

 \--------------- 

\#\#\# Hệ Thống Chẩn Đoán Nhiễm Khuẩn Vết Mổ CDC 2023

// \============================================================================ // HỆ THỐNG HỖ TRỢ RA QUYẾT ĐỊNH (DSS) \- KSNK // CHẨN ĐOÁN NHIỄM KHUẨN VẾT MỔ (SSI) // TIÊU CHUẨN: CDC/NHSN 2023 // NGÔN NGỮ: PSEUDOCODE // \============================================================================

// \---------------------------------------------------------------------------- // HÀM 1: KIỂM TRA THỜI GIAN GIÁM SÁT (SURVEILLANCE PERIOD) // \---------------------------------------------------------------------------- FUNCTION Determine\_Surveillance\_Period(Patient\_Data): // Phẫu thuật có cấy ghép nhân tạo (Implant) theo danh mục CDC yêu cầu theo dõi 90 ngày IF Patient\_Data.Has\_Implant \== TRUE AND Patient\_Data.Procedure\_Requires\_90\_Days\_Surveillance \== TRUE THEN RETURN 90\_Days ELSE RETURN 30\_Days END IF END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 2: KIỂM TRA NGOẠI LỆ (EXCLUSIONS) & PATOS // LƯU Ý: Khung thời gian IWP, RIT, SBAP tuyệt đối KHÔNG ĐƯỢC SỬ DỤNG cho SSI // \---------------------------------------------------------------------------- FUNCTION Check\_SSI\_Exclusions(Patient\_Data, Date\_Of\_Event): // Ngoại lệ 1: PATOS (Hiện diện lúc phẫu thuật) // Nếu có bằng chứng nhiễm khuẩn ở cùng độ sâu tại thời điểm mổ \-\> Vẫn chẩn đoán là SSI nhưng hệ thống đánh cờ PATOS \= TRUE để không tính vào mẫu số báo cáo SIR. SET PATOS\_Flag \= FALSE IF Patient\_Data.Infection\_Present\_At\_Time\_Of\_Surgery \== TRUE THEN PATOS\_Flag \= TRUE END IF

// Ngoại lệ 2: Thao tác xâm lấn hậu phẫu (Invasive Manipulation Exclusion)

// Không tính là SSI nếu vùng mổ hoàn toàn KHÔNG có dấu hiệu nhiễm khuẩn trước khi bị can thiệp chẩn đoán/điều trị (VD: chọc hút dịch, tiếp cận shunt).

IF Patient\_Data.Invasive\_Manipulation\_Done\_Post\_Op \== TRUE AND Patient\_Data.Signs\_Of\_Infection\_Before\_Manipulation \== FALSE THEN

    RETURN { "Status": "EXCLUDED\_INVASIVE\_MANIPULATION", "PATOS": PATOS\_Flag }

END IF

RETURN { "Status": "VALID", "PATOS": PATOS\_Flag }

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 3: CHẨN ĐOÁN SSI NÔNG (SUPERFICIAL INCISIONAL SSI) // Vị trí: Chỉ liên quan đến lớp da và mô dưới da (Skin and Subcutaneous tissue) // \---------------------------------------------------------------------------- FUNCTION Diagnose\_Superficial\_SSI(Patient\_Data): IF Patient\_Data.Infection\_Depth \!= "Skin\_Subcutaneous" THEN RETURN FALSE END IF

// Tiêu chuẩn 1: Chảy mủ hoặc Tiêu chuẩn 2: Cấy dịch vô khuẩn dương tính

IF (Patient\_Data.Purulent\_Drainage\_Superficial \== TRUE) OR

   (Patient\_Data.Aseptic\_Culture\_Positive\_Superficial \== TRUE) OR

   (Patient\_Data.Surgeon\_Diagnosis\_SSI\_Superficial \== TRUE) THEN // Tiêu chuẩn 4: PTV chẩn đoán

    RETURN TRUE

END IF

// Tiêu chuẩn 3: PTV chủ động mở vết mổ \+ Có dấu hiệu viêm \+ Cấy vi sinh KHÔNG âm tính

IF (Patient\_Data.Surgeon\_Deliberately\_Opens\_Superficial \== TRUE) AND

   (Patient\_Data.Pain\_Tenderness \== TRUE OR Patient\_Data.Localized\_Swelling \== TRUE OR Patient\_Data.Redness \== TRUE OR Patient\_Data.Heat \== TRUE) AND

   (Patient\_Data.Culture\_Negative\_Superficial \== FALSE) THEN

    RETURN TRUE

END IF

RETURN FALSE

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 4: CHẨN ĐOÁN SSI SÂU (DEEP INCISIONAL SSI) // Vị trí: Liên quan đến lớp cân và cơ (Fascia and Muscle) // \---------------------------------------------------------------------------- FUNCTION Diagnose\_Deep\_SSI(Patient\_Data): IF Patient\_Data.Infection\_Depth \!= "Fascia\_Muscle" THEN RETURN FALSE END IF

// Tiêu chuẩn 1: Chảy mủ sâu hoặc Tiêu chuẩn 3: Áp xe trên chẩn đoán hình ảnh/mổ lại

IF (Patient\_Data.Purulent\_Drainage\_Deep \== TRUE) OR

   (Patient\_Data.Abscess\_Found\_Deep\_Exam\_Imaging \== TRUE) OR

   (Patient\_Data.Surgeon\_Diagnosis\_SSI\_Deep \== TRUE) THEN // Tiêu chuẩn 4: PTV chẩn đoán

    RETURN TRUE

END IF

// Tiêu chuẩn 2: Vết mổ tự toác hoặc PTV chủ động mở sâu \+ Có triệu chứng \+ Cấy vi sinh KHÔNG âm tính

IF (Patient\_Data.Deep\_Incision\_Dehisces \== TRUE OR Patient\_Data.Surgeon\_Deliberately\_Opens\_Deep \== TRUE) AND

   (Patient\_Data.Fever \&gt; 38.0 OR Patient\_Data.Localized\_Pain\_Tenderness \== TRUE) AND

   (Patient\_Data.Culture\_Negative\_Deep \== FALSE) THEN

    RETURN TRUE

END IF

RETURN FALSE

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 5: CHẨN ĐOÁN SSI CƠ QUAN/KHOANG (ORGAN/SPACE SSI) // Vị trí: Liên quan đến bất kỳ cơ quan/khoang nào được can thiệp trong mổ // \---------------------------------------------------------------------------- FUNCTION Diagnose\_Organ\_Space\_SSI(Patient\_Data): IF Patient\_Data.Infection\_Depth \!= "Organ\_Space\_Manipulated" THEN RETURN FALSE END IF

// Bước 1: Phải đáp ứng tiêu chuẩn chung của cơ quan/khoang

SET Meets\_General\_Criteria \= FALSE

IF (Patient\_Data.Purulent\_Drainage\_From\_Organ\_Space\_Drain \== TRUE) OR

   (Patient\_Data.Aseptic\_Culture\_Positive\_Organ\_Space \== TRUE) OR

   (Patient\_Data.Abscess\_Found\_Organ\_Space\_Exam\_Imaging \== TRUE) OR

   (Patient\_Data.Surgeon\_Diagnosis\_SSI\_Organ\_Space \== TRUE) THEN

    Meets\_General\_Criteria \= TRUE

END IF

// Bước 2: BẮT BUỘC phải đáp ứng thêm 1 tiêu chuẩn NKBV chuyên biệt cho vị trí đó (VD: BONE, DISC, IAB, LUNG...)

IF Meets\_General\_Criteria \== TRUE AND Check\_Site\_Specific\_Organ\_Space\_Criteria(Patient\_Data.Organ\_Space\_Site\_Code) \== TRUE THEN

    RETURN TRUE

END IF

RETURN FALSE

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM MAIN: TỔNG HỢP, PHÂN CẤP VÀ QUY KẾT (SSI HIERARCHY & ATTRIBUTION) // \---------------------------------------------------------------------------- FUNCTION Evaluate\_SSI\_Event(Patient\_Data, Date\_Of\_Event):

// Bước 1: Kiểm tra Khung thời gian giám sát tĩnh

SET Days\_Post\_Op \= Date\_Of\_Event \- Patient\_Data.Surgery\_Date

SET Max\_Surveillance\_Days \= Determine\_Surveillance\_Period(Patient\_Data)

IF Days\_Post\_Op \&gt; Max\_Surveillance\_Days THEN

    RETURN {

        "Diagnosis": "No\_SSI",

        "Reason": "Out\_Of\_Surveillance\_Window"

    }

END IF

// Bước 2: Kiểm tra Ngoại lệ (Invasive Manipulation Exclusion) và cờ PATOS

SET Exclusion\_Check \= Check\_SSI\_Exclusions(Patient\_Data, Date\_Of\_Event)

IF Exclusion\_Check.Status \!= "VALID" THEN

    RETURN {

        "Diagnosis": "No\_SSI",

        "Reason": Exclusion\_Check.Status

    }

END IF

// Bước 3: Áp dụng Quy tắc ưu tiên mức độ sâu (Depth Hierarchy Rule)

// Nếu bệnh nhân thỏa mãn nhiều mức độ SSI cùng lúc tại một vị trí rạch da sơ cấp (Primary Incision), luôn báo cáo mức độ sâu nhất.

SET Final\_SSI\_Type \= "No\_SSI"

IF Diagnose\_Organ\_Space\_SSI(Patient\_Data) \== TRUE THEN

    Final\_SSI\_Type \= "SSI\_Organ\_Space"

ELSE IF Diagnose\_Deep\_SSI(Patient\_Data) \== TRUE THEN

    Final\_SSI\_Type \= "SSI\_Deep"

ELSE IF Diagnose\_Superficial\_SSI(Patient\_Data) \== TRUE THEN

    Final\_SSI\_Type \= "SSI\_Superficial"

END IF

IF Final\_SSI\_Type \== "No\_SSI" THEN

    RETURN {

        "Diagnosis": "No\_SSI",

        "Reason": "Criteria\_Not\_Met"

    }

END IF

// Bước 4: Áp dụng Luật Quy kết Vị trí (Transfer/Attribution Rule đặc thù cho SSI)

// SSI LUÔN được quy kết cho Cơ sở/Khoa thực hiện cuộc phẫu thuật đó (Nơi có Phòng Mổ), KHÔNG phụ thuộc vào việc bệnh nhân đang nằm ở khoa nào khi phát hiện bệnh.

SET Location\_Of\_Attribution \= Patient\_Data.Location\_Where\_Surgery\_Was\_Performed

// Bước 5: Đóng gói và trả về kết quả

RETURN {

    "Diagnosis": Final\_SSI\_Type,

    "Specific\_Site\_Code": IF Final\_SSI\_Type \== "SSI\_Organ\_Space" THEN Patient\_Data.Organ\_Space\_Site\_Code ELSE NULL,

    "Date\_Of\_Event": Date\_Of\_Event,

    "Location\_Of\_Attribution": Location\_Of\_Attribution,

    "Is\_PATOS": Exclusion\_Check.PATOS,

    "Pathogens\_Identified": Patient\_Data.Culture\_Result

}

END FUNCTION

 \--------------- 

\#\#\# Thuật toán Chẩn đoán Biến cố Liên quan Thở máy CDC 2023

Dưới đây là sơ đồ cây quyết định (Decision Tree) dưới dạng mã giả (Pseudocode) được thiết kế đặc tả riêng cho chẩn đoán \*\*Biến cố liên quan đến thở máy (VAE \- Ventilator-Associated Event)\*\* dành cho người lớn theo đúng Chương 10 của tiêu chuẩn CDC/NHSN 2023\.

Thuật toán VAE của CDC hoàn toàn dựa trên các chỉ số khách quan và được phân chia thành 3 tầng phân cấp rõ rệt (Hierarchy): \*\*VAC\*\* (Tình trạng liên quan thở máy) $\\\\rightarrow$ \*\*IVAC\*\* (Biến chứng nhiễm khuẩn) $\\\\rightarrow$ \*\*PVAP\*\* (Có khả năng viêm phổi thở máy).

// \============================================================================ // HỆ THỐNG HỖ TRỢ RA QUYẾT ĐỊNH (DSS) \- KSNK // CHẨN ĐOÁN BIẾN CỐ LIÊN QUAN ĐẾN THỞ MÁY (VAE) \- NGƯỜI LỚN // TIÊU CHUẨN: CDC/NHSN 2023 (CHƯƠNG 10\) // NGÔN NGỮ: PSEUDOCODE // \============================================================================

// \---------------------------------------------------------------------------- // HÀM 1: KIỂM TRA NGOẠI LỆ & ĐIỀU KIỆN SÀNG LỌC (EXCLUSIONS & PRE-REQUISITES) // \---------------------------------------------------------------------------- FUNCTION Check\_VAE\_Eligibility(Patient\_Data): // 1\. Phải được thở máy xâm nhập \>= 4 ngày (Ngày đặt ống là Ngày 1\) IF Patient\_Data.Mechanical\_Ventilation\_Days \< 4 THEN RETURN "NOT\_ELIGIBLE" END IF

// 2\. Loại trừ các phương pháp hỗ trợ hô hấp đặc biệt (nếu áp dụng toàn bộ ngày lịch)

IF Patient\_Data.Is\_On\_High\_Frequency\_Ventilation \== TRUE OR

   Patient\_Data.Is\_On\_ECMO \== TRUE THEN

    RETURN "EXCLUDED"

END IF

// Lưu ý: Nằm sấp (Prone), dùng Nitric Oxide, Heliox, Epoprostenol VẪN ĐƯỢC ĐƯA VÀO giám sát VAE.

RETURN "ELIGIBLE"

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 2: CHẨN ĐOÁN VAC (TÌNH TRẠNG LIÊN QUAN THỞ MÁY) // Dựa trên sự suy giảm oxy hóa máu sau một giai đoạn ổn định // \---------------------------------------------------------------------------- FUNCTION Diagnose\_VAC(Patient\_Data): // QUY TẮC PEEP: Các giá trị PEEP tối thiểu hàng ngày từ 0 \- 5 cmH2O được coi là tương đương nhau (Tính là 5).

// BƯỚC 1: Tìm Giai đoạn Ổn định (Baseline Period)

// Cần \&gt;= 2 ngày liên tiếp có PEEP tối thiểu hoặc FiO2 tối thiểu ổn định hoặc giảm xuống.

SET Has\_Baseline\_Period \= FALSE

IF (Patient\_Data.Stable\_Or\_Decreasing\_Daily\_Min\_PEEP\_Days \&gt;= 2\) OR

   (Patient\_Data.Stable\_Or\_Decreasing\_Daily\_Min\_FiO2\_Days \&gt;= 2\) THEN

    Has\_Baseline\_Period \= TRUE

END IF

IF Has\_Baseline\_Period \== FALSE THEN RETURN FALSE

// BƯỚC 2: Tìm Giai đoạn Suy giảm (Worsening Oxygenation)

// Xảy ra ngay sau Giai đoạn Ổn định và kéo dài \&gt;= 2 ngày liên tiếp.

IF (Patient\_Data.Daily\_Min\_PEEP\_Increase \&gt;= 3\_cmH2O FOR \&gt;= 2\_Days) OR

   (Patient\_Data.Daily\_Min\_FiO2\_Increase \&gt;= 0.20 FOR \&gt;= 2\_Days) THEN

    // Ngày sự kiện (DOE) chính là NGÀY ĐẦU TIÊN của Giai đoạn Suy giảm oxy hóa máu.

    // DOE phải nằm vào hoặc sau Ngày 3 của quá trình thở máy.

    IF Patient\_Data.Date\_Of\_Event\_MV\_Day \&gt;= 3 THEN

        RETURN TRUE // Đáp ứng VAC

    END IF

END IF

RETURN FALSE

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 3: CHẨN ĐOÁN IVAC (BIẾN CHỨNG CÓ TÍNH CHẤT NHIỄM KHUẨN) // \---------------------------------------------------------------------------- FUNCTION Diagnose\_IVAC(Patient\_Data, Date\_Of\_Event): // GIAI ĐOẠN CỬA SỔ VAE (VAE Window Period): // Gồm 5 ngày: 2 ngày trước DOE \+ Ngày DOE \+ 2 ngày sau DOE.

// 1\. Tiêu chuẩn Viêm (Cần \&gt;= 1 dấu hiệu trong VAE Window Period)

SET Has\_Inflammation \= FALSE

IF (Patient\_Data.Temp\_In\_Window \&gt; 38.0 OR Patient\_Data.Temp\_In\_Window \&lt; 36.0) OR

   (Patient\_Data.WBC\_In\_Window \&gt;= 12000 OR Patient\_Data.WBC\_In\_Window \&lt;= 4000\) THEN

    Has\_Inflammation \= TRUE

END IF

// 2\. Tiêu chuẩn Kháng sinh (Phải đáp ứng đủ số ngày QAD \- Qualifying Antimicrobial Days)

// Kháng sinh mới (New Antimicrobial) phải được BẮT ĐẦU trong VAE Window Period

// VÀ kéo dài liên tục \&gt;= 4 ngày (4 QADs). Khoảng cách giữa các liều không được quá 1 ngày lịch.

SET Has\_New\_Antimicrobial \= FALSE

IF Patient\_Data.New\_Antimicrobial\_Started\_In\_Window \== TRUE AND

   Patient\_Data.Qualifying\_Antimicrobial\_Days \&gt;= 4 THEN

    Has\_New\_Antimicrobial \= TRUE

END IF

IF Has\_Inflammation \== TRUE AND Has\_New\_Antimicrobial \== TRUE THEN

    RETURN TRUE // Đáp ứng IVAC

ELSE

    RETURN FALSE

END IF

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 4: CHẨN ĐOÁN PVAP (CÓ KHẢ NĂNG VIÊM PHỔI THỞ MÁY) // \---------------------------------------------------------------------------- FUNCTION Diagnose\_PVAP(Patient\_Data): // LƯU Ý LOẠI TRỪ TÁC NHÂN (Pathogen Exclusions): // \- Vi khuẩn cộng sinh hô hấp (Normal flora): LOẠI TRỪ HOÀN TOÀN. // \- Nấm men (Candida/Yeast), Coagulase-negative Staph, Enterococcus: BỊ LOẠI TRỪ nếu cấy từ đờm, ETA, BAL. CHỈ CHẤP NHẬN nếu cấy từ Mô phổi hoặc Dịch màng phổi.

// TIÊU CHUẨN 1: Nuôi cấy định lượng đạt ngưỡng từ Bệnh phẩm ít ô nhiễm

IF (Patient\_Data.Specimen \== "ETA" AND Patient\_Data.CFU\_ml \&gt;= 10^5) OR

   (Patient\_Data.Specimen \== "BAL" AND Patient\_Data.CFU\_ml \&gt;= 10^4) OR

   (Patient\_Data.Specimen \== "PSB" AND Patient\_Data.CFU\_ml \&gt;= 10^3) OR

   (Patient\_Data.Specimen \== "Lung\_Tissue" AND Patient\_Data.CFU\_g \&gt;= 10^4) THEN

    IF Check\_Valid\_Pathogen(Patient\_Data.Culture\_Result, Patient\_Data.Specimen) \== TRUE THEN

        RETURN TRUE

    END IF

END IF

// TIÊU CHUẨN 2: Dịch tiết hô hấp có mủ (Purulent Respiratory Secretions) \+ Vi sinh

// Định nghĩa mủ: \&gt;= 25 Bạch cầu đa nhân (Neutrophils) VÀ \&lt;= 10 Tế bào vảy (Squamous epithelial cells) / quang trường vật kính x10.

IF Patient\_Data.Sputum\_Neutrophils \&gt;= 25 AND Patient\_Data.Sputum\_Squamous\_Cells \&lt;= 10 THEN

    // Nếu có mủ, chỉ cần cấy định tính/bán định lượng (+) với vi khuẩn hợp lệ (không cần đạt ngưỡng CFU/ml khắt khe như Tiêu chuẩn 1\)

    IF Patient\_Data.Culture\_Positive \== TRUE AND Check\_Valid\_Pathogen(Patient\_Data.Culture\_Result, Patient\_Data.Specimen) \== TRUE THEN

        RETURN TRUE

    END IF

END IF

// TIÊU CHUẨN 3: Bằng chứng vi sinh/mô bệnh học khách quan khác

IF (Patient\_Data.Pleural\_Fluid\_Culture\_Positive \== TRUE) OR

   (Patient\_Data.Lung\_Histopathology\_Shows\_Abscess\_Or\_Fungal\_Invasion \== TRUE) OR

   (Patient\_Data.Viral\_Diagnostic\_Test\_Positive \== TRUE) OR // Cúm, RSV, Adenovirus, Rhino...

   (Patient\_Data.Legionella\_Test\_Positive \== TRUE) THEN

    RETURN TRUE

END IF

RETURN FALSE

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM MAIN: TỔNG HỢP VÀ XẾP HẠNG VAE (VAE HIERARCHY) // \---------------------------------------------------------------------------- FUNCTION Evaluate\_VAE\_Event(Patient\_Data, Date\_Of\_Event):

// Bước 1: Sàng lọc điều kiện

IF Check\_VAE\_Eligibility(Patient\_Data) \!= "ELIGIBLE" THEN

    RETURN "No\_VAE\_Event"

END IF

// Bước 2: Kiểm tra VAC (Nền tảng của mọi VAE)

IF Diagnose\_VAC(Patient\_Data) \== FALSE THEN

    RETURN "No\_VAE\_Event"

END IF

// Nếu qua được Bước 2, chắc chắn bệnh nhân bị VAC.

// Bước 3: Nâng cấp lên IVAC

IF Diagnose\_IVAC(Patient\_Data, Date\_Of\_Event) \== TRUE THEN

    // Bước 4: Nâng cấp lên PVAP

    IF Diagnose\_PVAP(Patient\_Data) \== TRUE THEN

        RETURN "PVAP" // Mức độ cao nhất

    ELSE

        RETURN "IVAC" // Dừng ở mức IVAC

    END IF

ELSE

    RETURN "VAC" // Không có dấu hiệu nhiễm khuẩn, chỉ là VAC

END IF

END FUNCTION

\#\#\# 💡 Các điểm hiệu chỉnh kiến trúc đặc thù (Architectural Notes) ánh xạ từ cẩm nang CDC:

1\. \*\*Luật PEEP Đồng nhất (0-5 cmH2O rule):\*\* Trong thuật toán \`Diagnose\_VAC\`, CDC quy định bất kỳ giá trị PEEP tối thiểu nào trong ngày từ 0 đến 5 đều được coi là 5 cmH2O. Nghĩa là để ghi nhận một đợt "suy giảm" về PEEP (tăng $\\\\ge 3$), PEEP của bệnh nhân phải đạt tối thiểu mức 8 cmH2O \\\[1\\\]. Thuật toán phải tự động làm phẳng (flatten) các giá trị PEEP nhỏ hơn 5 trước khi tính toán độ chênh lệch.

2\. \*\*Quy tắc Giai đoạn Cửa sổ (VAE Window Period):\*\* Khác với IWP 7 ngày của các nhiễm khuẩn khác, Cửa sổ VAE chỉ có 5 ngày tĩnh (2 ngày trước \+ Ngày sự kiện \+ 2 ngày sau) \\\[2\\\]. Khối \`Diagnose\_IVAC\` giới hạn bộ quét bạch cầu, nhiệt độ và kháng sinh khắt khe trong khung 5 ngày này.

3\. \*\*Quy tắc tính ngày Kháng sinh hợp lệ (QAD):\*\* Để được tính là "Kháng sinh mới", thuốc không được phép xuất hiện trong 2 ngày trước Ngày bắt đầu tiêm. Và để đạt đủ 4 QADs, khoảng cách ngắt quãng giữa 2 liều kháng sinh không được lớn hơn 1 ngày lịch \\\[3-5\\\].

4\. \*\*Luật Vi sinh Rác (Pathogen Exclusions) cho PVAP:\*\* Giống như chẩn đoán PNEU, khối \`Diagnose\_PVAP\` loại bỏ hoàn toàn các vi sinh vật thường trú (\*Candida/Yeast\*, CoNS, \*Enterococcus\*) ra khỏi tiêu chuẩn chẩn đoán trừ khi chúng được lấy bằng thủ thuật vô khuẩn hoàn toàn như chọc dịch màng phổi hoặc sinh thiết mô phổi \\\[6-9\\\]. Việc ghi nhận dịch đờm mủ cũng đòi hỏi phải soi tươi đạt độ tinh sạch cao ($\\\\ge 25$ BCĐN và $\\\\le 10$ tế bào vảy) \\\[10, 11\\\].

 \--------------- 

\#\#\# Thuật Toán Chẩn Đoán Viêm Phổi PNEU/VAP Theo CDC 2023

Dưới đây là sơ đồ cây quyết định (Decision Tree) dưới dạng mã giả (Pseudocode) được thiết kế đặc tả riêng cho chẩn đoán \*\*Viêm phổi bệnh viện (PNEU) \&amp; Viêm phổi liên quan đến thở máy (VAP)\*\* theo đúng Chương 6 (PNEU/VAP) của tiêu chuẩn CDC/NHSN 2023\.

Thuật toán đã được tích hợp đầy đủ phân loại \*\*PNU1 (Lâm sàng)\*\*, \*\*PNU2 (Vi sinh phổ thông)\*\*, \*\*PNU3 (Suy giảm miễn dịch)\*\*, sự phân biệt theo lứa tuổi, các ngưỡng định lượng vi sinh khắt khe (CFU/ml), và các bẫy logic về vi sinh vật bị loại trừ (như nấm men, khuẩn cộng sinh hô hấp).

// \============================================================================ // HỆ THỐNG HỖ TRỢ RA QUYẾT ĐỊNH (DSS) \- KSNK // CHẨN ĐOÁN VIÊM PHỔI (PNEU) & VIÊM PHỔI THỞ MÁY (VAP) // TIÊU CHUẨN: CDC/NHSN 2023 (CHƯƠNG 6\) // NGÔN NGỮ: PSEUDOCODE // \============================================================================

// \---------------------------------------------------------------------------- // HÀM 1: KIỂM TRA ĐIỀU KIỆN THỞ MÁY (VAP vs HAP/PNEU) // \---------------------------------------------------------------------------- FUNCTION Check\_Ventilator\_Association(Patient\_Data, Date\_Of\_Event): // NB phải thở máy \> 2 ngày lịch liên tiếp (Ngày đặt ống là Ngày 1\) // VÀ máy thở phải đang lưu vào Ngày sự kiện (DOE) hoặc ngày ngay trước đó IF Patient\_Data.Ventilator\_Days \> 2 AND (Patient\_Data.Is\_Ventilated\_On\_DOE \== TRUE OR Patient\_Data.Is\_Ventilated\_Day\_Before\_DOE \== TRUE) THEN RETURN "VAP" // Viêm phổi liên quan thở máy ELSE RETURN "HAP" // Viêm phổi bệnh viện (Không thở máy) END IF END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 2: KIỂM TRA TÁC NHÂN LOẠI TRỪ (PATHOGEN EXCLUSIONS) // \---------------------------------------------------------------------------- FUNCTION Check\_PNEU\_Pathogen\_Validity(Culture\_Result, Specimen\_Type, Is\_PNU3\_Candida\_Exception): // 1\. Loại trừ vi khuẩn cộng sinh hô hấp chung IF Culture\_Result CONTAINS ANY \["Normal respiratory flora", "Mixed oral flora", "Altered oral flora"\] THEN RETURN "INVALID" END IF

// 2\. Loại trừ nấm cộng đồng (Không bao giờ được tính là NKBV)

IF Culture\_Result CONTAINS ANY \["Blastomyces", "Histoplasma", "Coccidioides", "Paracoccidioides", "Cryptococcus", "Pneumocystis"\] THEN

    RETURN "INVALID"

END IF

// 3\. Quy tắc loại trừ Candida/Yeast, Coagulase-negative Staph (CoNS) và Enterococcus

// Các chủng này KHÔNG được tính nếu lấy từ đờm, hút nội khí quản (ETA), rửa phế quản phế nang (BAL)

IF Culture\_Result CONTAINS ANY \["Candida", "Yeast", "Coagulase-negative Staphylococcus", "Enterococcus"\] THEN

    // Ngoại lệ 1: Được chấp nhận nếu bệnh phẩm là mô phổi (Lung tissue) hoặc dịch màng phổi (Pleural fluid)

    IF Specimen\_Type IN \["Lung\_Tissue", "Pleural\_Fluid"\] THEN

        RETURN "VALID"

    END IF

    // Ngoại lệ 2: Được chấp nhận cho PNU3 nếu cấy máu (+) trùng với cấy dịch hô hấp dưới (+) ra Candida

    IF Is\_PNU3\_Candida\_Exception \== TRUE AND Culture\_Result CONTAINS "Candida" THEN

        RETURN "VALID"

    END IF

    RETURN "INVALID"

END IF

RETURN "VALID"

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 3: ĐÁNH GIÁ BẰNG CHỨNG HÌNH ẢNH HỌC (IMAGING TEST EVIDENCE) // \---------------------------------------------------------------------------- FUNCTION Evaluate\_Imaging\_Criteria(Patient\_Data): // Nếu NB mắc bệnh tim/phổi nền (Suy tim, COPD, RDS...): BẮT BUỘC cần \>= 2 phim XQ/CT liên tiếp // Nếu NB KHÔNG có bệnh tim/phổi nền: CHỈ CẦN 1 phim XQ/CT đạt chuẩn là đủ SET Required\_Images \= IF Patient\_Data.Has\_Underlying\_Cardiac\_Pulmonary\_Disease THEN 2 ELSE 1

IF Patient\_Data.Serial\_Chest\_Imaging\_Count \&gt;= Required\_Images THEN

    IF (Patient\_Data.Imaging\_Shows\_New\_And\_Persistent\_Infiltrate \== TRUE) OR

       (Patient\_Data.Imaging\_Shows\_Progressive\_And\_Persistent\_Infiltrate \== TRUE) OR

       (Patient\_Data.Imaging\_Shows\_Consolidation \== TRUE) OR

       (Patient\_Data.Imaging\_Shows\_Cavitation \== TRUE) OR

       (Patient\_Data.Age \&lt;= 1\_Year AND Patient\_Data.Imaging\_Shows\_Pneumatoceles \== TRUE) THEN

        RETURN TRUE

    END IF

END IF

RETURN FALSE

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 4: CHẨN ĐOÁN PNU1 \- VIÊM PHỔI LÂM SÀNG (KHÔNG CẦN BẰNG CHỨNG VI SINH) // \---------------------------------------------------------------------------- FUNCTION Diagnose\_PNU1(Patient\_Data): SET Has\_Systemic\_Signs \= FALSE SET Resp\_Sign\_Count \= 0

// Đánh giá theo nhóm tuổi

IF Patient\_Data.Age \&gt; 12\_Years THEN

    // 1\. Dấu hiệu toàn thân (Cần \&gt;= 1\)

    IF (Patient\_Data.Fever \&gt; 38.0) OR (Patient\_Data.WBC \&lt;= 4000 OR Patient\_Data.WBC \&gt;= 12000\) OR (Patient\_Data.Age \&gt;= 70\_Years AND Patient\_Data.Altered\_Mental\_Status \== TRUE) THEN

        Has\_Systemic\_Signs \= TRUE

    END IF

    // 2\. Dấu hiệu hô hấp (Cần \&gt;= 2\)

    Resp\_Sign\_Count \= COUNT\_TRUE(Patient\_Data.New\_Purulent\_Sputum, Patient\_Data.New\_Worsening\_Cough\_Dyspnea\_Tachypnea, Patient\_Data.Rales\_Or\_Bronchial\_Breath\_Sounds, Patient\_Data.Worsening\_Gas\_Exchange)

    IF Has\_Systemic\_Signs \== TRUE AND Resp\_Sign\_Count \&gt;= 2 THEN RETURN TRUE

ELSE IF Patient\_Data.Age \&lt;= 1\_Year THEN

    // Trẻ sơ sinh/Trẻ nhỏ \&lt;= 1 tuổi: Bắt buộc phải có suy giảm trao đổi khí \+ 3 dấu hiệu khác

    IF Patient\_Data.Worsening\_Gas\_Exchange \== TRUE THEN

        Resp\_Sign\_Count \= COUNT\_TRUE(Patient\_Data.Temp\_Instability, Patient\_Data.WBC\_Abnormal\_With\_Left\_Shift, Patient\_Data.New\_Purulent\_Sputum, Patient\_Data.Apnea\_Tachypnea\_Nasal\_Flaring, Patient\_Data.Wheezing\_Rales, Patient\_Data.Cough, Patient\_Data.Abnormal\_Heart\_Rate)

        IF Resp\_Sign\_Count \&gt;= 3 THEN RETURN TRUE

    END IF

ELSE // Trẻ em từ 1-12 tuổi (Cần \&gt;= 3 dấu hiệu bất kỳ trong list)

    Resp\_Sign\_Count \= COUNT\_TRUE(Patient\_Data.Fever\_Or\_Hypothermia, Patient\_Data.WBC\_Abnormal, Patient\_Data.New\_Purulent\_Sputum, Patient\_Data.New\_Worsening\_Cough\_Apnea\_Tachypnea, Patient\_Data.Rales\_Or\_Bronchial\_Breath\_Sounds, Patient\_Data.Worsening\_Gas\_Exchange)

    IF Resp\_Sign\_Count \&gt;= 3 THEN RETURN TRUE

END IF

RETURN FALSE

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 5: CHẨN ĐOÁN PNU2 \- VIÊM PHỔI CÓ BẰNG CHỨNG VI SINH CHUẨN // \---------------------------------------------------------------------------- FUNCTION Diagnose\_PNU2(Patient\_Data): // 1\. Phải thỏa mãn Dấu hiệu lâm sàng của PNU2 (Giống hệt PNU1 nhưng Dấu hiệu hô hấp chỉ cần \>= 1\) SET Meets\_PNU2\_Clinical \= FALSE IF (Patient\_Data.Fever \> 38.0 OR Patient\_Data.WBC \<= 4000 OR Patient\_Data.WBC \>= 12000 OR (Patient\_Data.Age \>= 70\_Years AND Patient\_Data.Altered\_Mental\_Status \== TRUE)) AND (Patient\_Data.New\_Purulent\_Sputum \== TRUE OR Patient\_Data.New\_Worsening\_Cough\_Dyspnea\_Tachypnea \== TRUE OR Patient\_Data.Rales\_Or\_Bronchial\_Breath\_Sounds \== TRUE OR Patient\_Data.Worsening\_Gas\_Exchange \== TRUE) THEN Meets\_PNU2\_Clinical \= TRUE END IF

IF Meets\_PNU2\_Clinical \== FALSE THEN RETURN FALSE

// 2\. Bằng chứng vi sinh (Phải đáp ứng \&gt;= 1 tiêu chí khắt khe và hợp lệ tác nhân)

IF Check\_PNEU\_Pathogen\_Validity(Patient\_Data.Culture\_Result, Patient\_Data.Specimen\_Type, FALSE) \== "INVALID" THEN

    RETURN FALSE

END IF

IF (Patient\_Data.Blood\_Culture\_Positive \== TRUE) OR

   (Patient\_Data.Pleural\_Fluid\_Culture\_Positive \== TRUE) OR

   (Patient\_Data.Specimen\_Type \== "ETA" AND Patient\_Data.CFU\_ml \&gt;= 10^5) OR     // Hút nội khí quản

   (Patient\_Data.Specimen\_Type \== "BAL" AND Patient\_Data.CFU\_ml \&gt;= 10^4) OR     // Rửa phế quản phế nang

   (Patient\_Data.Specimen\_Type \== "PSB" AND Patient\_Data.CFU\_ml \&gt;= 10^3) OR     // Chải có bảo vệ

   (Patient\_Data.Specimen\_Type \== "Lung\_Tissue" AND Patient\_Data.CFU\_g \&gt;= 10^4) OR

   (Patient\_Data.BAL\_Cells\_With\_Intracellular\_Bacteria \&gt;= 5\_Percent) OR

   (Patient\_Data.Histopathology\_Shows\_Pneumonia\_Abscess\_Fungi \== TRUE) OR

   (Patient\_Data.Viral\_Legionella\_Chlamydia\_Mycoplasma\_Test\_Positive \== TRUE) THEN

    RETURN TRUE

END IF

RETURN FALSE

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 6: CHẨN ĐOÁN PNU3 \- VIÊM PHỔI TRÊN BỆNH NHÂN SUY GIẢM MIỄN DỊCH // \---------------------------------------------------------------------------- FUNCTION Diagnose\_PNU3(Patient\_Data): // Phải là NB suy giảm miễn dịch (Neutropenia \< 500, HIV CD4 \< 200, Ghép tạng, Hóa trị...) IF Patient\_Data.Is\_Immunocompromised \== FALSE THEN RETURN FALSE

// 1\. Triệu chứng lâm sàng (Chỉ cần \&gt;= 1 dấu hiệu bất kỳ)

IF NOT (Patient\_Data.Fever \&gt; 38.0 OR Patient\_Data.Altered\_Mental\_Status \== TRUE OR Patient\_Data.New\_Purulent\_Sputum \== TRUE OR Patient\_Data.New\_Worsening\_Cough\_Dyspnea\_Tachypnea \== TRUE OR Patient\_Data.Rales\_Or\_Bronchial\_Breath\_Sounds \== TRUE OR Patient\_Data.Worsening\_Gas\_Exchange \== TRUE OR Patient\_Data.Hemoptysis \== TRUE OR Patient\_Data.Pleuritic\_Chest\_Pain \== TRUE) THEN

    RETURN FALSE

END IF

// 2\. Bằng chứng vi sinh (Tập trung vào nấm hoặc đáp ứng mốc PNU2)

IF (Patient\_Data.Blood\_Culture\_Matches\_LRT\_Candida \== TRUE) OR // Ngoại lệ cho phép Candida

   (Patient\_Data.Fungi\_Found\_In\_Minimally\_Contaminated\_LRT \== TRUE AND Patient\_Data.Culture\_Result NOT CONTAINS "Candida") OR

   (Diagnose\_PNU2(Patient\_Data) \== TRUE) THEN // Đáp ứng bằng chứng Lab của PNU2

    RETURN TRUE

END IF

RETURN FALSE

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM MAIN: KẾT XUẤT PHÂN LOẠI PNEU / VAP CUỐI CÙNG (HIERARCHY) // \---------------------------------------------------------------------------- FUNCTION Evaluate\_PNEU\_VAP\_Event(Patient\_Data, Date\_Of\_Event):

// Bước 1: Kiểm tra Bằng chứng Hình ảnh (Yêu cầu bắt buộc đầu tiên)

IF Evaluate\_Imaging\_Criteria(Patient\_Data) \== FALSE THEN

    RETURN { "Diagnosis": "No\_PNEU", "Type": NULL }

END IF

// Bước 2: Áp dụng quy tắc phân cấp (Hierarchy) \- Đánh giá từ PNU3 \-\&gt; PNU2 \-\&gt; PNU1

SET Final\_PNU\_Type \= "No\_PNEU"

IF Diagnose\_PNU3(Patient\_Data) \== TRUE THEN

    Final\_PNU\_Type \= "PNU3"

ELSE IF Diagnose\_PNU2(Patient\_Data) \== TRUE THEN

    Final\_PNU\_Type \= "PNU2"

ELSE IF Diagnose\_PNU1(Patient\_Data) \== TRUE THEN

    Final\_PNU\_Type \= "PNU1"

END IF

// Bước 3: Nếu không thỏa mãn bất kỳ mức nào

IF Final\_PNU\_Type \== "No\_PNEU" THEN

    RETURN { "Diagnosis": "No\_PNEU", "Type": NULL }

END IF

// Bước 4: Áp dụng Bộ lọc Máy thở để xác định VAP hay HAP

SET Vent\_Status \= Check\_Ventilator\_Association(Patient\_Data, Date\_Of\_Event)

// Đóng gói đối tượng JSON trả về hệ thống

RETURN {

    "Diagnosis": CONCAT(Vent\_Status, "\_", Final\_PNU\_Type), // VD: VAP\_PNU2 hoặc HAP\_PNU1

    "Date\_Of\_Event": Date\_Of\_Event,

    "Is\_Ventilator\_Associated": IF Vent\_Status \== "VAP" THEN TRUE ELSE FALSE,

    "Pathogens": IF Final\_PNU\_Type IN \["PNU2", "PNU3"\] THEN Patient\_Data.Culture\_Result ELSE "None\_Reportable\_For\_PNU1"

}

END FUNCTION

\#\#\# 💡 Các điểm hiệu chỉnh quan trọng phản ánh chính xác cẩm nang CDC:

1\. \*\*Phân cấp chẩn đoán (Diagnostic Hierarchy):\*\* Sơ đồ được lập trình theo luồng ưu tiên nghiêm ngặt của CDC: Hệ thống sẽ luôn ưu tiên kiểm tra \`PNU3\` trước, nếu không đạt mới xét \`PNU2\`, và cuối cùng là \`PNU1\` \\\[1, 2\\\].

2\. \*\*Loại trừ "Bằng chứng Vi sinh Rác" (Pathogen Exclusions):\*\* Khối \`Check\_PNEU\_Pathogen\_Validity\` khóa chặt các tác nhân như khuẩn cộng sinh đường hô hấp, các loại nấm men (Yeast/Candida) hay \*Enterococcus\* \\\[3, 4\\\]. CDC quy định rất rõ: Nếu cấy đờm hoặc cấy dịch hút nội khí quản (ETA) ra \*Candida\*, lập tức bị hệ thống gạt bỏ, trừ khi đó là bệnh nhân Suy giảm miễn dịch (PNU3) và có cấy máu cũng ra \*Candida\* \\\[4-6\\\].

3\. \*\*Ngưỡng định lượng khắt khe (Quantitative Thresholds):\*\* Thuật toán yêu cầu chính xác định lượng \`CFU/ml\` tùy theo phương pháp lấy mẫu: rửa phế quản phế nang (BAL) $\\\\ge10^4$, chải có bảo vệ (PSB) $\\\\ge10^3$, hút dịch nội khí quản (ETA) $\\\\ge10^5$ \\\[7, 8\\\]. Nếu dưới ngưỡng này, hệ thống sẽ từ chối chẩn đoán \`PNU2\`.

4\. \*\*Phân biệt rạch ròi VAE và VAP:\*\* Thuật toán được thiết kế thành cấu trúc module, cho phép phần mềm nhận diện "cốt lõi viêm phổi" trước (PNEU), sau đó đối chiếu chéo số ngày thở máy của bệnh nhân. Nếu bệnh nhân thở máy \&gt; 2 ngày, hệ thống sẽ kết luận là \`VAP\_PNU2\`, ngược lại sẽ là Viêm phổi bệnh viện (Không thở máy) \`HAP\_PNU2\` \\\[9\\\]. Tác nhân vi sinh chỉ được phép báo cáo đối với PNU2 và PNU3, PNU1 sẽ không ghi nhận tác nhân \\\[2\\\].

 \--------------- 

\#\#\# Thuật toán Chẩn đoán UTI và CAUTI theo CDC/NHSN 2023

Dưới đây là sơ đồ cây quyết định (Decision Tree) dưới dạng mã giả (Pseudocode) được thiết kế đặc tả riêng cho chẩn đoán \*\*Nhiễm khuẩn tiết niệu (UTI) \&amp; Nhiễm khuẩn tiết niệu liên quan đến ống thông (CAUTI)\*\* theo đúng tiêu chuẩn của CDC/NHSN 2023\.

Thuật toán đã được tối ưu hóa để xử lý các bẫy logic (edge cases) cực kỳ quan trọng của CDC, bao gồm: Quy tắc loại trừ nấm men/vi khuẩn hỗn hợp, Quy tắc triệt tiêu triệu chứng kích thích khi đang lưu ống thông, và Ranh giới giữa SUTI (có triệu chứng) và ABUTI (không triệu chứng nhưng có nhiễm khuẩn huyết thứ phát).

// \============================================================================ // HỆ THỐNG HỖ TRỢ RA QUYẾT ĐỊNH (DSS) \- KSNK // CHẨN ĐOÁN NHIỄM KHUẨN TIẾT NIỆU (UTI & CAUTI) // TIÊU CHUẨN: CDC/NHSN 2023 // NGÔN NGỮ: PSEUDOCODE // \============================================================================

// \---------------------------------------------------------------------------- // HÀM 1: KIỂM TRA TÍNH HỢP LỆ CỦA KẾT QUẢ CẤY NƯỚC TIỂU (URINE CULTURE VALIDITY) // \---------------------------------------------------------------------------- FUNCTION Check\_Urine\_Culture\_Validity(Urine\_Culture): // 1\. Loại trừ nếu kết quả trả về là "Vi khuẩn hỗn hợp" (Mixed flora) // hoặc có từ 3 chủng vi sinh vật trở lên (CDC quy định tối đa 2 chủng) IF Urine\_Culture.Species\_Count \> 2 OR Urine\_Culture.Has\_Mixed\_Flora \== TRUE THEN RETURN "INVALID\_CULTURE" END IF

// 2\. Loại trừ hoàn toàn nếu CHỈ phân lập được các tác nhân không hợp lệ

// (Bao gồm: Nấm men/Candida, Nấm mốc, Ký sinh trùng, Nấm lưỡng hình)

IF Urine\_Culture.Contains\_ONLY\_Excluded\_Organisms \== TRUE THEN

    RETURN "INVALID\_PATHOGEN"

END IF

// 3\. Phải có ÍT NHẤT MỘT chủng VI KHUẨN (Bacterium) đạt ngưỡng định lượng \&gt;= 10^5 CFU/ml (100,000 CFU/ml)

IF Urine\_Culture.Highest\_Bacterium\_CFU\_ml \&lt; 100000 THEN

    RETURN "INSUFFICIENT\_COLONY\_COUNT"

END IF

RETURN "VALID\_CULTURE"

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 2: XÁC ĐỊNH LIÊN QUAN ĐẾN ỐNG THÔNG TIỂU (IUC / FOLEY) // \---------------------------------------------------------------------------- FUNCTION Check\_Catheter\_Association(Patient\_Data, Date\_Of\_Event): // Ống thông phải được lưu \> 2 ngày lịch (Ngày đặt tính là Ngày 1\) tại khu vực nội trú // VÀ phải đang hiện diện vào Ngày sự kiện (DOE) hoặc ngày ngay trước DOE. IF Patient\_Data.IUC\_Days \> 2 AND (Patient\_Data.Has\_IUC\_On\_DOE \== TRUE OR Patient\_Data.Has\_IUC\_Day\_Before\_DOE \== TRUE) THEN RETURN TRUE // CAUTI ELSE RETURN FALSE // Non-CAUTI END IF END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 3: ĐÁNH GIÁ TRIỆU CHỨNG LÂM SÀNG THEO ĐỘ TUỔI VÀ TÌNH TRẠNG ỐNG THÔNG // \---------------------------------------------------------------------------- FUNCTION Evaluate\_SUTI\_Symptoms(Patient\_Data, Is\_Catheter\_Associated): SET Has\_Valid\_Symptoms \= FALSE

// NHÓM 1: Bệnh nhi \&lt;= 1 tuổi (SUTI 2\)

IF Patient\_Data.Age \&lt;= 1\_Year THEN

    IF (Patient\_Data.Fever \&gt; 38.0) OR

       (Patient\_Data.Hypothermia \&lt; 36.0) OR

       (Patient\_Data.Apnea \== TRUE) OR

       (Patient\_Data.Bradycardia \== TRUE) OR

       (Patient\_Data.Lethargy \== TRUE) OR

       (Patient\_Data.Vomiting \== TRUE) OR

       (Patient\_Data.Suprapubic\_Tenderness \== TRUE) THEN

        Has\_Valid\_Symptoms \= TRUE

    END IF

    RETURN Has\_Valid\_Symptoms

END IF

// NHÓM 2: Bệnh nhân \&gt; 1 tuổi (SUTI 1a / 1b)

IF Patient\_Data.Age \&gt; 1\_Year THEN

    // Triệu chứng toàn thân \&amp; tại chỗ (Luôn được chấp nhận)

    IF (Patient\_Data.Fever \&gt; 38.0) OR

       (Patient\_Data.Suprapubic\_Tenderness \== TRUE) OR

       (Patient\_Data.Costovertebral\_Angle\_Pain \== TRUE) THEN

        Has\_Valid\_Symptoms \= TRUE

    END IF

    // Triệu chứng kích thích bàng quang (CHỈ ĐƯỢC CHẤP NHẬN NẾU KHÔNG CÓ ỐNG THÔNG)

    // Thuật toán: Không cho phép dùng Tiểu buốt/Tiểu rắt/Tiểu gấp nếu đang lưu ống thông

    IF Is\_Catheter\_Associated \== FALSE THEN

        IF (Patient\_Data.Urinary\_Urgency \== TRUE) OR

           (Patient\_Data.Urinary\_Frequency \== TRUE) OR

           (Patient\_Data.Dysuria \== TRUE) THEN

            Has\_Valid\_Symptoms \= TRUE

        END IF

    END IF

    RETURN Has\_Valid\_Symptoms

END IF

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 4: PHÂN LOẠI CHUẨN ĐOÁN UTI (SUTI 1a, SUTI 1b, SUTI 2, ABUTI) // \---------------------------------------------------------------------------- FUNCTION Diagnose\_Base\_UTI(Patient\_Data, Date\_Of\_Event): // BƯỚC 1: Kiểm tra tính hợp lệ của cấy vi sinh nước tiểu trong Giai đoạn cửa sổ (IWP) IF Check\_Urine\_Culture\_Validity(Patient\_Data.Urine\_Culture) \!= "VALID\_CULTURE" THEN RETURN "No\_UTI" END IF

// BƯỚC 2: Kiểm tra liên quan thiết bị (Catheter)

SET Is\_CAUTI \= Check\_Catheter\_Association(Patient\_Data, Date\_Of\_Event)

// BƯỚC 3: Quét triệu chứng lâm sàng

SET Has\_Symptoms \= Evaluate\_SUTI\_Symptoms(Patient\_Data, Is\_CAUTI)

// BƯỚC 4: Rẽ nhánh Nhiễm khuẩn tiết niệu KHÔNG TRIỆU CHỨNG nhưng CÓ NHIỄM KHUẨN HUYẾT (ABUTI)

// Bắt buộc: KHÔNG CÓ bất kỳ triệu chứng SUTI nào \+ Cấy máu dương tính trùng khớp tác nhân trong nước tiểu

IF Has\_Symptoms \== FALSE THEN

    IF Patient\_Data.Blood\_Culture\_Positive \== TRUE AND Patient\_Data.Blood\_Culture\_Matches\_Urine\_Bacterium \== TRUE THEN

        IF Is\_CAUTI \== TRUE THEN RETURN "CAUTI\_ABUTI"

        ELSE RETURN "Non\_CAUTI\_ABUTI"

    ELSE

        RETURN "No\_UTI" // Đây chỉ là Vi khuẩn niệu không triệu chứng (ASB) \- Không báo cáo NKBV

    END IF

END IF

// BƯỚC 5: Rẽ nhánh Nhiễm khuẩn tiết niệu CÓ TRIỆU CHỨNG (SUTI)

IF Has\_Symptoms \== TRUE THEN

    // Bệnh nhi \&lt;= 1 tuổi

    IF Patient\_Data.Age \&lt;= 1\_Year THEN

        IF Is\_CAUTI \== TRUE THEN RETURN "CAUTI\_SUTI\_2"

        ELSE RETURN "Non\_CAUTI\_SUTI\_2"

    END IF

    // Bệnh nhân \&gt; 1 tuổi

    IF Patient\_Data.Age \&gt; 1\_Year THEN

        IF Is\_CAUTI \== TRUE THEN RETURN "CAUTI\_SUTI\_1a" // Liên quan ống thông

        ELSE RETURN "Non\_CAUTI\_SUTI\_1b"                 // Không liên quan ống thông

    END IF

END IF

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 5: QUY KẾT TRÁCH NHIỆM VỊ TRÍ & KIỂM TRA TRANSFER RULE (LUẬT LUÂN CHUYỂN) // \---------------------------------------------------------------------------- FUNCTION Determine\_Location\_Of\_Attribution(Date\_Of\_Event, Patient\_Location\_History): Locations\_On\_DOE \= Get\_Locations\_On\_Date(Patient\_Location\_History, Date\_Of\_Event) Locations\_Day\_Before\_DOE \= Get\_Locations\_On\_Date(Patient\_Location\_History, Date\_Of\_Event \- 1\_Day)

// Áp dụng Transfer Rule: Nếu ngày sự kiện xảy ra vào Ngày chuyển khoa hoặc Ngày hôm sau

IF (Patient\_Was\_Transferred\_On(Date\_Of\_Event) \== TRUE) OR

   (Patient\_Was\_Transferred\_On(Date\_Of\_Event \- 1\_Day) \== TRUE) THEN

    // Quy kết cho KHOA CŨ (Khoa bệnh nhân nằm vào ngày trước DOE)

    RETURN Locations\_Day\_Before\_DOE.First\_Location

ELSE

    // Quy kết cho KHOA HIỆN TẠI

    RETURN Locations\_On\_DOE.First\_Location

END IF

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM MAIN: KẾT XUẤT ĐẦU RA CA BỆNH CAUTI/UTI // \---------------------------------------------------------------------------- FUNCTION Evaluate\_UTI\_Event(Patient\_Data, Date\_Of\_Event, Patient\_Location\_History):

SET Diagnosis\_Result \= Diagnose\_Base\_UTI(Patient\_Data, Date\_Of\_Event)

IF Diagnosis\_Result \== "No\_UTI" THEN

    RETURN {

        "Diagnosis": "No\_UTI",

        "Is\_CAUTI": FALSE,

        "Location\_Of\_Attribution": NULL

    }

END IF

SET LOA \= Determine\_Location\_Of\_Attribution(Date\_Of\_Event, Patient\_Location\_History)

// Đóng gói đối tượng JSON trả về hệ thống

RETURN {

    "Diagnosis": Diagnosis\_Result,

    "Date\_Of\_Event": Date\_Of\_Event,

    "Location\_Of\_Attribution": LOA,

    "Is\_CAUTI": IF Diagnosis\_Result CONTAINS "CAUTI\_" THEN TRUE ELSE FALSE,

    "Pathogens\_Identified": Patient\_Data.Urine\_Culture.Bacteria\_List

}

END FUNCTION

\#\#\# 💡 Ghi chú kiến trúc hệ thống (Systems Architecture Notes) được ánh xạ từ văn bản CDC:

1\. \*\*Nghiệm pháp chống "Dương tính giả" với Nấm (Pathogen Exclusion):\*\* Khối \`Check\_Urine\_Culture\_Validity\` tự động loại bỏ các ca mà Khoa Vi sinh chỉ trả về Nấm men (Yeast/Candida) \\\[1\\\]. Theo NHSN, Candida trong nước tiểu không bao giờ được phép quy kết là tác nhân gây UTI/CAUTI.

2\. \*\*Khóa Logic Triệu Chứng Kích Thích (IUC Logic Lock):\*\* Hàm \`Evaluate\_SUTI\_Symptoms\` thiết lập ràng buộc cứng: Không được phép dùng các triệu chứng \`Urinary\_Urgency\` (tiểu gấp), \`Urinary\_Frequency\` (tiểu rắt), \`Dysuria\` (tiểu buốt) để tính là triệu chứng nếu bệnh nhân \*đang lưu ống thông\* (SUTI 1a) \\\[2, 3\\\]. Lý do y khoa: Ống thông cọ xát vào niêm mạc bàng quang vốn đã tạo ra các triệu chứng kích thích này (False symptoms).

3\. \*\*Mã hóa chẩn đoán đa tầng ABUTI:\*\* UTI có tỷ lệ không triệu chứng rất cao (ASB). Sơ đồ đã bẻ nhánh phân tầng rõ ràng: Nếu không có triệu chứng, hệ thống bắt buộc đối chiếu kết quả cấy máu trong cùng \*Giai đoạn cửa sổ\*. Nếu có vi khuẩn lọt vào máu trùng khớp với vi khuẩn nước tiểu, ca bệnh được nâng cấp thành \*\*Nhiễm khuẩn tiết niệu không triệu chứng nhưng có nhiễm khuẩn huyết thứ phát (ABUTI)\*\* \\\[1\\\], ngược lại, hệ thống loại bỏ hoàn toàn (No\\\_UTI).

 \--------------- 

\#\#\# Thuật Toán Chẩn Đoán Nhiễm Khuẩn Huyết CDC/NHSN 2023

// \============================================================================ // HỆ THỐNG HỖ TRỢ RA QUYẾT ĐỊNH (DSS) \- KSNK // CHẨN ĐOÁN NHIỄM KHUẨN HUYẾT (BSI) & CLABSI TÍCH HỢP QUY TẮC QUY KẾT VỊ TRÍ // TIÊU CHUẨN: CDC/NHSN 2023 // NGÔN NGỮ: PSEUDOCODE // \============================================================================

// \---------------------------------------------------------------------------- // HÀM 1: KIỂM TRA TÁC NHÂN LOẠI TRỪ (PATHOGEN EXCLUSIONS) // \---------------------------------------------------------------------------- FUNCTION Check\_Pathogen\_Validity(Blood\_Cultures): // 1\. Loại trừ hoàn toàn khỏi mọi chẩn đoán NHSN \[1\], \[2\] IF Blood\_Cultures CONTAINS ANY \["Blastomyces", "Histoplasma", "Coccidioides", "Paracoccidioides", "Cryptococcus", "Pneumocystis"\] THEN RETURN "INVALID\_PATHOGEN" END IF

// 2\. Loại trừ không được phép là tác nhân DUY NHẤT gây BSI tiên phát \[2\]

IF Blood\_Cultures.Is\_Sole\_Pathogen \== TRUE AND Blood\_Cultures CONTAINS ANY \["Campylobacter", "Salmonella", "Shigella", "Listeria", "Vibrio", "Yersinia", "C. difficile", "Enterohemorrhagic E. coli", "Enteropathogenic E. coli", "Parasites", "Viruses"\] THEN

    RETURN "INVALID\_FOR\_PRIMARY\_BSI"

END IF

RETURN "VALID"

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 2: XÁC ĐỊNH LOẠI NHIỄM KHUẨN HUYẾT (LCBI 1, 2, 3\) // \---------------------------------------------------------------------------- FUNCTION Diagnose\_Base\_LCBI(Patient\_Data, Blood\_Cultures): // Phải là BSI Tiên phát (Không thứ phát từ UTI, PNEU, SSI, IAB...) \[3\] IF Patient\_Data.Is\_Secondary\_BSI \== TRUE THEN RETURN "Secondary\_BSI" END IF

IF Check\_Pathogen\_Validity(Blood\_Cultures) \!= "VALID" THEN

    RETURN "No\_BSI"

END IF

// LCBI 1: Tác nhân gây bệnh thực sự (Recognized Pathogen) \[4\]

IF Blood\_Cultures.Has\_Recognized\_Pathogen \== TRUE THEN

    RETURN "LCBI\_1"

END IF

// LCBI 2 \&amp; 3: Vi khuẩn cộng sinh (Common Commensal) \[5\], \[6\]

IF Blood\_Cultures.Has\_Common\_Commensal \== TRUE AND Blood\_Cultures.Matching\_Commensal\_Occasions \&gt;= 2 THEN

    // LCBI 2: Bệnh nhân \&gt; 1 tuổi \[5\]

    IF Patient\_Data.Age \&gt; 1\_Year THEN

        IF (Patient\_Data.Fever \&gt; 38.0) OR (Patient\_Data.Chills \== TRUE) OR (Patient\_Data.Hypotension \== TRUE) THEN

            RETURN "LCBI\_2"

        END IF

    END IF

    // LCBI 3: Bệnh nhân \&lt;= 1 tuổi \[6\]

    IF Patient\_Data.Age \&lt;= 1\_Year THEN

        IF (Patient\_Data.Fever \&gt; 38.0) OR (Patient\_Data.Hypothermia \&lt; 36.0) OR (Patient\_Data.Apnea \== TRUE) OR (Patient\_Data.Bradycardia \== TRUE) THEN

            RETURN "LCBI\_3"

        END IF

    END IF

END IF

RETURN "No\_BSI"

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 3: XÁC ĐỊNH MBI-LCBI (TỔN THƯƠNG HÀNG RÀO NIÊM MẠC RUỘT) // \---------------------------------------------------------------------------- FUNCTION Check\_MBI\_LCBI(Patient\_Data, Base\_LCBI\_Type, Blood\_Cultures): SET Has\_MBI\_Risk \= FALSE IF Patient\_Data.Allo\_SCT\_with\_GI\_GVHD \== TRUE OR Patient\_Data.Allo\_SCT\_with\_Severe\_Diarrhea \== TRUE OR Patient\_Data.Neutropenia\_ANC\_WBC\_Under\_500\_For\_2\_Days \== TRUE THEN Has\_MBI\_Risk \= TRUE END IF

IF Has\_MBI\_Risk \== FALSE THEN

    RETURN Base\_LCBI\_Type

END IF

// MBI-LCBI 1 \[7\]

IF Base\_LCBI\_Type \== "LCBI\_1" THEN

    IF Blood\_Cultures.Contains\_ONLY\_MBI\_Intestinal\_Organisms \== TRUE THEN

        RETURN "MBI\_LCBI\_1"

    END IF

END IF

// MBI-LCBI 2 \&amp; 3 \[7\]

IF Base\_LCBI\_Type IN \["LCBI\_2", "LCBI\_3"\] THEN

    IF Blood\_Cultures.Contains\_ONLY\_Viridans\_Strep\_Or\_Rothia \== TRUE THEN

        IF Base\_LCBI\_Type \== "LCBI\_2" THEN RETURN "MBI\_LCBI\_2"

        IF Base\_LCBI\_Type \== "LCBI\_3" THEN RETURN "MBI\_LCBI\_3"

    END IF

END IF

RETURN Base\_LCBI\_Type

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 4: QUY KẾT NƠI XẢY RA SỰ KIỆN (LOCATION OF ATTRIBUTION \- LOA) // Tích hợp Quy tắc Luân chuyển (Transfer Rule) \[8\], \[9\], \[10\] // \---------------------------------------------------------------------------- FUNCTION Determine\_Location\_Of\_Attribution(Date\_Of\_Event, Patient\_Location\_History): Locations\_On\_DOE \= Get\_Locations\_On\_Date(Patient\_Location\_History, Date\_Of\_Event) Locations\_Day\_Before\_DOE \= Get\_Locations\_On\_Date(Patient\_Location\_History, Date\_Of\_Event \- 1\_Day)

// Nếu Ngày sự kiện (DOE) rơi vào ngày chuyển khoa/xuất viện HOẶC ngày kế tiếp \[8\]

IF (Patient\_Was\_Transferred\_Or\_Discharged\_On(Date\_Of\_Event) \== TRUE) OR

   (Patient\_Was\_Transferred\_Or\_Discharged\_On(Date\_Of\_Event \- 1\_Day) \== TRUE) THEN

    // Transfer Rule: Quy kết cho KHOA ĐẦU TIÊN bệnh nhân nằm vào ngày HÔM TRƯỚC Ngày sự kiện (DOE \- 1\) \[9\]

    RETURN Locations\_Day\_Before\_DOE.First\_Location

ELSE

    // Nếu không vi phạm Transfer Rule, quy kết cho khoa hiện tại vào Ngày sự kiện

    RETURN Locations\_On\_DOE.First\_Location

END IF

END FUNCTION

// \---------------------------------------------------------------------------- // HÀM 5: KẾT LUẬN LIÊN QUAN ĐƯỜNG TRUYỀN (CLABSI), NGOẠI LỆ & QUY KẾT VỊ TRÍ // \---------------------------------------------------------------------------- FUNCTION Diagnose\_Final\_BSI\_Event(Patient\_Data, Date\_Of\_Event, Patient\_Location\_History):

// Bước 1: Xác định loại BSI nền

SET Base\_LCBI \= Diagnose\_Base\_LCBI(Patient\_Data, Patient\_Data.Blood\_Cultures)

IF Base\_LCBI IN \["No\_BSI", "Secondary\_BSI", "INVALID\_PATHOGEN", "INVALID\_FOR\_PRIMARY\_BSI"\] THEN

    RETURN {

        "Diagnosis": Base\_LCBI,

        "Location\_Of\_Attribution": NULL,

        "Is\_CLABSI": FALSE

    }

END IF

// Bước 2: Đánh giá MBI-LCBI

SET Final\_BSI\_Type \= Check\_MBI\_LCBI(Patient\_Data, Base\_LCBI, Patient\_Data.Blood\_Cultures)

// Bước 3: Xác định khoa chịu trách nhiệm (LOA) theo Transfer Rule \[8\]

SET LOA \= Determine\_Location\_Of\_Attribution(Date\_Of\_Event, Patient\_Location\_History)

// Bước 4: Kiểm tra điều kiện CVC hợp lệ để xác nhận CLABSI \[11\]

SET Is\_Eligible\_Central\_Line \= FALSE

IF Patient\_Data.CVC\_Days \&gt; 2 AND (Patient\_Data.Has\_CVC\_On\_DOE \== TRUE OR Patient\_Data.Has\_CVC\_Day\_Before\_DOE \== TRUE) THEN

    Is\_Eligible\_Central\_Line \= TRUE

END IF

IF Is\_Eligible\_Central\_Line \== FALSE THEN

    RETURN {

        "Diagnosis": CONCAT("Primary\_BSI\_Non\_CLABSI (", Final\_BSI\_Type, ")"),

        "Location\_Of\_Attribution": LOA,

        "Is\_CLABSI": FALSE

    }

END IF

// Bước 5: Kiểm tra các trường hợp ngoại lệ (Exclusions from SIR) \[12\], \[13\], \[14\], \[15\]

SET Is\_Excluded\_From\_CLABSI\_SIR \= FALSE

SET Exclusion\_Reason \= ""

IF Patient\_Data.Is\_On\_ECMO \== TRUE THEN

    Is\_Excluded\_From\_CLABSI\_SIR \= TRUE; Exclusion\_Reason \= "ECMO"

ELSE IF Patient\_Data.Has\_VAD \== TRUE THEN

    Is\_Excluded\_From\_CLABSI\_SIR \= TRUE; Exclusion\_Reason \= "VAD"

ELSE IF Patient\_Data.Observed\_Patient\_Self\_Injection \== TRUE THEN

    Is\_Excluded\_From\_CLABSI\_SIR \= TRUE; Exclusion\_Reason \= "Patient\_Injection"

ELSE IF Patient\_Data.Has\_Epidermolysis\_Bullosa \== TRUE THEN

    Is\_Excluded\_From\_CLABSI\_SIR \= TRUE; Exclusion\_Reason \= "EB"

ELSE IF Patient\_Data.Has\_Munchausen\_Syndrome\_By\_Proxy \== TRUE THEN

    Is\_Excluded\_From\_CLABSI\_SIR \= TRUE; Exclusion\_Reason \= "MSBP"

ELSE IF Patient\_Data.Has\_Pus\_At\_Another\_Vascular\_Access\_Site \== TRUE AND Patient\_Data.Pus\_Culture\_Matches\_Blood \== TRUE THEN

    Is\_Excluded\_From\_CLABSI\_SIR \= TRUE; Exclusion\_Reason \= "Pus\_at\_vascular\_site"

ELSE IF Patient\_Data.Pathogen \== "Group B Streptococcus" AND Patient\_Data.Age\_In\_Days \&lt;= 6 THEN

    Is\_Excluded\_From\_CLABSI\_SIR \= TRUE; Exclusion\_Reason \= "Group\_B\_Strep\_Neonate"

END IF

// Bước 6: Đóng gói dữ liệu đầu ra hợp lệ

IF Is\_Excluded\_From\_CLABSI\_SIR \== TRUE THEN

    SET Event\_Result \= CONCAT("LCBI\_Excluded\_From\_CLABSI\_SIR \[Reason: ", Exclusion\_Reason, "\] (", Final\_BSI\_Type, ")")

    SET CLABSI\_Flag \= FALSE

ELSE

    SET Event\_Result \= CONCAT("CLABSI (", Final\_BSI\_Type, ")")

    SET CLABSI\_Flag \= TRUE

END IF

RETURN {

    "Diagnosis": Event\_Result,

    "Date\_Of\_Event": Date\_Of\_Event,

    "Location\_Of\_Attribution": LOA,

    "Is\_CLABSI": CLABSI\_Flag

}

END FUNCTION

