#!/usr/bin/env python3

import argparse
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email(to_email, subject, body):
    sender_email = "CLASHub@ufl.edu"
    smtp_server = 'smtp.ufhpc'
    smtp_port = 25

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.sendmail(sender_email, to_email, msg.as_string())
        print("Email sent successfully.")
    except Exception as e:
        print(f"Failed to send email. Error: {e}")

def main():
    parser = argparse.ArgumentParser(description='Send Email Notification Before Analysis')
    parser.add_argument('--email', required=True, help='User email address')
    parser.add_argument('--jobID', required=True, help='Job ID')
    parser.add_argument('--species', required=True, help='Species')
    parser.add_argument('--sample_count', required=True, type=int, help='Number of samples')
    parser.add_argument('--sample_info', action='append', required=True, help='Sample information')

    args = parser.parse_args()

    # Determine the analysis name based on jobID prefix
    if args.jobID.startswith('aqPE'):
        analysis_name = 'Paired-end FASTQ miRNA-seq Analysis'
    elif args.jobID.startswith('aqSE'):
        analysis_name = 'Single-end FASTQ miRNA-seq Analysis'
    elif args.jobID.startswith('aqCR'):
        analysis_name = 'Clean Read FASTA miRNA-seq Analysis'
    elif args.jobID.startswith('CLQ'):
        analysis_name = 'Paired-end FASTQ CLASH Analysis'
    elif args.jobID.startswith('CLA'):
        analysis_name = 'Cleaned FASTA CLASH Analysis'
    elif args.jobID.startswith('rsTPM'):
        analysis_name = 'Gene Expression Quantification (TPM) RNA-seq Analysis'
    elif args.jobID.startswith('rsDeq'):
        analysis_name = 'Differential Expression Analysis (DESeq2) RNA-seq Analysis'
    elif args.jobID.startswith('CUR'):
        analysis_name = 'Cumulative Fraction Curve Analysis'  # New analysis type for CUR prefix
    else:
        analysis_name = 'Unknown Analysis'

    # Build email body
    email_body = f"""Hello,

Thank you for using CLASHub for your {analysis_name}. Below are the details of your submitted job:

Job ID: {args.jobID}
Analysis Type: {analysis_name}
Species: {args.species}
Email: {args.email}
Number of Samples: {args.sample_count}
"""

    for sample_info in args.sample_info:
        email_body += f"\n{sample_info}"

    email_body += """

CLASHub is currently processing the submitted data. An additional notification will be sent when the analysis is complete.

In case of any issues or if the processed files are not received, please contact luli1@ufl.edu for assistance.

Best regards,
CLASHub
"""

    # Send email
    subject = f'CLASHub Job Submission Confirmation - Job ID: {args.jobID}'
    send_email(args.email, subject, email_body)

if __name__ == '__main__':
    main()