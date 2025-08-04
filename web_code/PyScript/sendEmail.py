import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import sys
import os

def send_email(file_paths, receiver_email, jobID):
    print(f"Python JobID {jobID}")
    sender_email = "CLASHub@ufl.edu"
    subject = f"File Download JobID {jobID}"
    base_url = "http://clashhub.rc.ufl.edu"

    # 构建纯文本内容（用于不支持HTML的客户端）
    text_lines = ["Hello,\n"]

    # 构建HTML内容
    html_lines = ["<html><body><p>Hello,</p>"]

    # 根据 file_paths 构建邮件内容
    if len(file_paths) == 2:
        if jobID[:4] in ["aqPE", "aqSE", "aqCR"]:
            total_file_path, isoform_file_path = file_paths
            total_file_name = os.path.basename(total_file_path)
            isoform_file_name = os.path.basename(isoform_file_path)
            download_total_link = f"{base_url}/{jobID}/{total_file_name}"
            download_isoform_link = f"{base_url}/{jobID}/{isoform_file_name}"
            download_report_link = f"{base_url}/{jobID}/mirnaseq_Analysis_Report.html"
            text_lines.append(f"Your raw data processing summary is: {download_report_link}\n")
            text_lines.append(f"Your raw miRNA count (total abundance) is: {download_total_link}\n")
            text_lines.append(f"Your raw miRNA count (isoform abundance) is: {download_isoform_link}\n")
            html_lines.append(f"<p>Your raw data processing summary is: <a href='{download_report_link}'>{download_report_link}</a></p>")
            html_lines.append(f"<p>Your raw miRNA count (total abundance) is: <a href='{download_total_link}'>{download_total_link}</a></p>")
            html_lines.append(f"<p>Your raw miRNA count (isoform abundance) is: <a href='{download_isoform_link}'>{download_isoform_link}</a></p>")
        if jobID[:3] == "CUR":
            curve_file, target_file = file_paths
            curve_file = os.path.basename(curve_file)
            target_file = os.path.basename(target_file)
            download_curve_link = f"{base_url}/{jobID}/{curve_file}"
            download_targetFile_link = f"{base_url}/{jobID}/{target_file}"
            text_lines.append(f"Your cumulative fraction curve is: {download_curve_link}\n")
            text_lines.append(f"Your merged targets data is: {download_targetFile_link}\n")
            html_lines.append(f"<p>Your cumulative fraction curve is: <a href='{download_curve_link}'>{download_curve_link}</a></p>")
            html_lines.append(f"<p>Your merged targets data is: <a href='{download_targetFile_link}'>{download_targetFile_link}</a></p>")

    if len(file_paths) == 1:
        total_file_path = file_paths[0]
        total_file_name = os.path.basename(total_file_path)
        download_total_link = f"{base_url}/{jobID}/{total_file_name}"

        if jobID[:3] in ["CLQ", "CLA"]:
            report_name = "_".join(jobID.split("_")[1:]) + "_analysis_report.html"
            download_report_link = f"{base_url}/{jobID}/{report_name}"
            text_lines.append(f"Your analysis report link: {download_report_link}\n")
            text_lines.append(f"Your output's link: {download_total_link}\n")
            html_lines.append(f"<p>Your analysis report link: <a href='{download_report_link}'>{download_report_link}</a></p>")
            html_lines.append(f"<p>Your output's link: <a href='{download_total_link}'>{download_total_link}</a></p>")
        if jobID[:5] == "rsDeq":
            download_report_link = f"{base_url}/{jobID}/RNAseq_Analysis_Report.html"
            download_genecount_link = f"{base_url}/{jobID}/gene_count_reordered.csv"
            download_deseq2_link = f"{base_url}/{jobID}/DE_results.annotated.csv"
            text_lines.extend([
                f"Your raw fastq data processing summary is: {download_report_link}\n",
                f"Your raw gene count is: {download_genecount_link}\n",
                f"Your differential gene expression analysis results are: {download_deseq2_link}\n"
            ])
            html_lines.append(f"<p>Your raw fastq data processing summary is: <a href='{download_report_link}'>{download_report_link}</a></p>")
            html_lines.append(f"<p>Your raw gene count is: <a href='{download_genecount_link}'>{download_genecount_link}</a></p>")
            html_lines.append(f"<p>Your differential gene expression analysis results are: <a href='{download_deseq2_link}'>{download_deseq2_link}</a></p>")
        if jobID[:5] == "rsTPM":
            download_report_link = f"{base_url}/{jobID}/RNAseq_Analysis_Report.html"
            download_geneTPM_link = f"{base_url}/{jobID}/geneTPM.csv"
            text_lines.extend([
                f"Your raw fastq data processing summary is: {download_report_link}\n",
                f"Your raw gene TPM is: {download_geneTPM_link}\n"
            ])
            html_lines.append(f"<p>Your raw fastq data processing summary is: <a href='{download_report_link}'>{download_report_link}</a></p>")
            html_lines.append(f"<p>Your raw gene TPM is: <a href='{download_geneTPM_link}'>{download_geneTPM_link}</a></p>")

    # 在邮件中添加加粗提示语句
    bold_line = "<strong>Please download within 7 days, otherwise it will be deleted.</strong>"
    text_lines.append("Please download within 7 days, otherwise it will be deleted.\n")
    html_lines.append(f"<p>{bold_line}</p>")

    text_lines.append("\nThank you for using CLASHub.\n\nBest regards,\nCLASHub.\n")
    html_lines.append("<p>Thank you for using CLASHub.</p>")
    html_lines.append("<p>Best regards,<br>CLASHub.</p>")
    html_lines.append("</body></html>")

    text_message = "\n".join(text_lines)
    html_message = "\n".join(html_lines)

    # 使用 MIMEMultipart 构建带有纯文本和HTML格式的邮件
    msg = MIMEMultipart("alternative")
    msg['From'] = sender_email
    msg['To'] = receiver_email
    msg['Subject'] = subject

    # 添加纯文本和HTML两个部分
    msg.attach(MIMEText(text_message, 'plain'))
    msg.attach(MIMEText(html_message, 'html'))

    try:
        with smtplib.SMTP('smtp.ufhpc', 25) as server:
            server.sendmail(sender_email, receiver_email, msg.as_string())
        print("Email sent successfully.")
    except Exception as e:
        print(f"Failed to send email. Error: {e}")

if __name__ == "__main__":
    # 收集命令行参数
    args = sys.argv[1:]
    if len(args) < 3:
        print("Usage: sendEmail.py <file_path(s)> <receiver_email> <jobID>")
        sys.exit(1)
    receiver_email = args[-2]
    jobID = args[-1]
    file_paths = args[:-2]
    send_email(file_paths, receiver_email, jobID)