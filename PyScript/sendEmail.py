import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import sys
import os

def send_email(file_paths, receiver_email, jobID, env):
    print(f"Python JobID {jobID}")
    sender_email = "CLASHub@ufl.edu"
    subject = f"File Download JobID {jobID}"
    base_url = "https://devclashub.rc.ufl.edu" if env == "dev" else "https://clashub.rc.ufl.edu"

    text_lines = ["Hello,\n"]
    html_lines = ["<html><body><p>Hello,</p>"]

    # ==========================================================
    # 1. Cumulative Fraction Curve (CUR) - NEW LOGIC (Flexible file count)
    # ==========================================================
    if jobID.startswith("CUR"):
        html_lines.append(f"<h3 style='color: #2c3e50;'>Cumulative Fraction Curve Results:</h3>")
        html_lines.append("<ul>")
        text_lines.append("--- Cumulative Fraction Curve Results ---\n")

        # Iterate through all files passed (could be 2 or 3)
        for f_path in file_paths:
            f_name = os.path.basename(f_path)
            link = f"{base_url}/{jobID}/{f_name}"
            
            # [CHANGE] Check for "Standard.svg" instead of "Base.svg"
            if "Standard.svg" in f_name:
                text_lines.append(f"Standard Analysis Plot: {link}\n")
                html_lines.append(f"<li><strong>Standard Analysis Plot:</strong> <a href='{link}'>{link}</a></li>")
            
            # [CHANGE] Check for "Stringent.svg" instead of "Advanced.svg"
            elif "Stringent.svg" in f_name:
                text_lines.append(f"Stringent Filtering Plot (Top 25%): {link}\n")
                html_lines.append(f"<li><strong>Stringent Filtering Plot (Top 25%):</strong> <a href='{link}'>{link}</a></li>")
            
            elif ".csv" in f_name:
                text_lines.append(f"Merged Data CSV: {link}\n")
                html_lines.append(f"<li><strong>Merged Data CSV:</strong> <a href='{link}'>{link}</a></li>")
            else:
                # Fallback for unexpected files
                text_lines.append(f"Result File: {link}\n")
                html_lines.append(f"<li>Result File: <a href='{link}'>{link}</a></li>")
        
        html_lines.append("</ul>")

    # ==========================================================
    # 2. Mirseq (aqPE/aqSE/aqCR) - Length check (2 Files)
    # ==========================================================
    elif len(file_paths) == 2 and jobID[:4] in ["aqPE", "aqSE", "aqCR"]:
        total_file_path, isoform_file_path = file_paths
        total_file_name = os.path.basename(total_file_path)
        isoform_file_name = os.path.basename(isoform_file_path)
        download_total_link = f"{base_url}/{jobID}/{total_file_name}"
        download_isoform_link = f"{base_url}/{jobID}/{isoform_file_name}"
        download_report_link = f"{base_url}/{jobID}/mirnaseq_analysis_report.html"
        
        text_lines.append(f"Your raw data processing summary is: {download_report_link}\n")
        text_lines.append(f"Your raw miRNA count (total abundance) is: {download_total_link}\n")
        text_lines.append(f"Your raw miRNA count (isoform abundance) is: {download_isoform_link}\n")
        
        html_lines.append(f"<p>Your raw data processing summary is: <a href='{download_report_link}'>{download_report_link}</a></p>")
        html_lines.append(f"<p>Your raw miRNA count (total abundance) is: <a href='{download_total_link}'>{download_total_link}</a></p>")
        html_lines.append(f"<p>Your raw miRNA count (isoform abundance) is: <a href='{download_isoform_link}'>{download_isoform_link}</a></p>")

    # ==========================================================
    # 3. CLASH (CLQ/CLA) - Length check (1 File + Generated Links)
    # ==========================================================
    elif len(file_paths) == 1 and (jobID.startswith("CLQ") or jobID.startswith("CLA")):
        total_file_path = file_paths[0]
        total_file_name = os.path.basename(total_file_path)
        download_total_link = f"{base_url}/{jobID}/{total_file_name}"
        base = total_file_path
        base_name = os.path.basename(base)
        csv_file = f"{base_name}_FinalResult_with_piranha.csv"
        bw_file = f"{base_name}.genome.bw"

        download_csv_link = f"{base_url}/{jobID}/{csv_file}"
        download_bw_link = f"{base_url}/{jobID}/{bw_file}"
        report_name = "_".join(jobID.split("_")[1:]) + "_analysis_report.html"
        download_report_link = f"{base_url}/{jobID}/{report_name}"

        text_lines.append(f"Your analysis report link: {download_report_link}\n")
        text_lines.append(f"Your result CSV file: {download_csv_link}\n")
        text_lines.append(f"Your bigWig file: {download_bw_link}\n")
        html_lines.append(f"<p>Your analysis report link: <a href='{download_report_link}'>{download_report_link}</a></p>")
        html_lines.append(f"<p>Your result CSV file: <a href='{download_csv_link}'>{download_csv_link}</a></p>")
        html_lines.append(f"<p>Your bigWig file: <a href='{download_bw_link}'>{download_bw_link}</a></p>")

    # ==========================================================
    # 4. RNA-seq (rsDeq/rsTPM)
    # ==========================================================
    elif jobID.startswith("rsDeq") or jobID.startswith("rsTPM"):
        # 1. Standard Analysis Header
        download_report_link = f"{base_url}/{jobID}/RNAseq_analysis_report.html"
        download_genecount_link = f"{base_url}/{jobID}/gene_count_matrix.csv"
        download_geneTPM_link = f"{base_url}/{jobID}/geneTPM.csv"

        html_lines.append(f"<h3 style='color: #2c3e50;'>1. Standard Analysis Results:</h3>")
        html_lines.append(f"<ul>")
        
        # Standard Links
        html_lines.append(f"<li>QC Report: <a href='{download_report_link}'>{download_report_link}</a></li>")
        html_lines.append(f"<li>TPM Matrix: <a href='{download_geneTPM_link}'>{download_geneTPM_link}</a></li>")
        html_lines.append(f"<li>Raw Count Matrix: <a href='{download_genecount_link}'>{download_genecount_link}</a></li>")
        
        text_lines.append("--- Standard Analysis Results ---\n")
        text_lines.append(f"QC Report: {download_report_link}\n")
        text_lines.append(f"TPM Matrix: {download_geneTPM_link}\n")
        text_lines.append(f"Raw Count Matrix: {download_genecount_link}\n")

        # DESeq2 Specific Link
        if jobID.startswith("rsDeq"):
            download_deseq2_link = f"{base_url}/{jobID}/differential_expression_results.csv"
            html_lines.append(f"<li><strong>Differential Expression Results:</strong> <a href='{download_deseq2_link}'>{download_deseq2_link}</a></li>")
            text_lines.append(f"Differential Expression Results: {download_deseq2_link}\n")
        
        html_lines.append(f"</ul>")
        
        # 2. EISA Analysis Header (Check if files exist in args)
        has_eisa = any("eisa" in str(fp).lower() for fp in file_paths)
        
        if has_eisa:
            download_eisa_exon = f"{base_url}/{jobID}/gene_count_eisa_exon_matrix.csv"
            download_eisa_intron = f"{base_url}/{jobID}/gene_count_eisa_intron_matrix.csv"
            
            html_lines.append(f"<h3 style='color: #d9534f;'>2. EISA Analysis Results (Add-on):</h3>")
            html_lines.append(f"<ul>")
            
            html_lines.append(f"<li>Exon Count Matrix: <a href='{download_eisa_exon}'>{download_eisa_exon}</a></li>")
            html_lines.append(f"<li>Intron Count Matrix: <a href='{download_eisa_intron}'>{download_eisa_intron}</a></li>")
            
            text_lines.append("\n--- EISA Analysis Results ---\n")
            text_lines.append(f"Exon Count Matrix: {download_eisa_exon}\n")
            text_lines.append(f"Intron Count Matrix: {download_eisa_intron}\n")

            if jobID.startswith("rsDeq"):
                download_eisa_res = f"{base_url}/{jobID}/EISA_analysis_results.csv"
                html_lines.append(f"<li><strong>EISA Mechanism Results:</strong> <a href='{download_eisa_res}'>{download_eisa_res}</a></li>")
                text_lines.append(f"EISA Mechanism Results: {download_eisa_res}\n")
            
            html_lines.append(f"</ul>")

    # ==========================================================
    # Footer
    # ==========================================================
    bold_line = "<strong>Please download within 7 days, otherwise it will be deleted.</strong>"
    text_lines.append("\nPlease download within 7 days, otherwise it will be deleted.\n")
    html_lines.append(f"<p>{bold_line}</p>")

    text_lines.append("\nThank you for using CLASHub.\n\nBest regards,\nCLASHub.\n")
    html_lines.append("<p>Thank you for using CLASHub.</p>")
    html_lines.append("<p>Best regards,<br>CLASHub.</p>")
    html_lines.append("</body></html>")

    text_message = "\n".join(text_lines)
    html_message = "\n".join(html_lines)

    msg = MIMEMultipart("alternative")
    msg['From'] = sender_email
    msg['To'] = receiver_email
    msg['Subject'] = subject
    msg.attach(MIMEText(text_message, 'plain'))
    msg.attach(MIMEText(html_message, 'html'))

    try:
        with smtplib.SMTP('smtp.ufhpc', 25) as server:
            server.sendmail(sender_email, receiver_email, msg.as_string())
        print("Email sent successfully by python3.")
    except Exception as e:
        print(f"Failed to send email. Error: {e}")

if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) < 4:
        print("Usage: sendEmail.py <file_path(s)> <receiver_email> <jobID> <env>")
        sys.exit(1)
    receiver_email = args[-3]
    jobID = args[-2]
    env = args[-1]
    file_paths = args[:-3]
    send_email(file_paths, receiver_email, jobID, env)