<?php
// 启用错误报告以便调试
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// 检查请求方法是否为 POST
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // 获取用户提交的数据
    $email = htmlspecialchars($_POST['email']); // 用户输入的邮箱
    $name = htmlspecialchars($_POST['name']); // 用户输入的名字
    $institution = htmlspecialchars($_POST['institution']); // 用户输入的机构
    $details = htmlspecialchars($_POST['details']); // 用户输入的反馈详情

    // 收件人邮箱（固定为您的邮箱）
    $to = "luli1@ufl.edu"; // 替换为您的邮箱
    $subject = "CLASHub Feedback from $name";

    // 邮件内容
    $message = "You have received a new feedback submission from CLASHub:\n\n";
    $message .= "Name: $name\n";
    $message .= "Email: $email\n";
    $message .= "Institution: $institution\n";
    $message .= "Details:\n$details\n";

    // 设置邮件头
    $headers = "From: $email\r\n";
    $headers .= "Reply-To: $email\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

    // 使用 mail() 函数发送邮件
    if (mail($to, $subject, $message, $headers)) {
        // 显示成功页面
        echo <<<HTML
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Feedback Submitted</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    background-color: #f4f4f9;
                }
                .thank-you-container {
                    text-align: center;
                    padding: 30px;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .thank-you-container h1 {
                    color: #333;
                    font-size: 2rem;
                }
                .thank-you-container p {
                    color: #555;
                    margin: 10px 0 20px;
                    font-size: 1.1rem;
                }
                .thank-you-container a {
                    text-decoration: none;
                    color: white;
                    background-color: #007BFF;
                    padding: 10px 20px;
                    border-radius: 5px;
                    font-size: 1rem;
                    transition: background-color 0.3s;
                }
                .thank-you-container a:hover {
                    background-color: #0056b3;
                }
            </style>
        </head>
        <body>
            <div class="thank-you-container">
                <h1>Thank You for Your Feedback!</h1>
                <p>Your feedback has been successfully submitted. We greatly appreciate your input.</p>
                <a href="../index.html">Return to Home</a>
            </div>
        </body>
        </html>
        HTML;
    } else {
        echo "Failed to send feedback. Please try again later.";
    }
} else {
    echo "Invalid request method.";
}
?>