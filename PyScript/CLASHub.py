import getopt, os, re, sys, glob, logging, traceback
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import pandas as pd
from Bio.Seq import Seq
import plotly.express as px
from scipy.stats import mannwhitneyu
from jinja2 import Template
from textwrap import fill
import textwrap
import traceback

logging.basicConfig(filename='/pubapps/mingyi.xie/clashhub/prod/app/Sbatch_documents/error.log', level=logging.DEBUG,
                    format='%(asctime)s:%(levelname)s:%(message)s')
class BedGraph():
    def making_simple_version(self, file, chromosome_name):
        with open(file, 'r+') as f1:
            for line1 in f1:
                line2 = line1.strip().split('\t')
                chromosome = line2[0]
                if chromosome_name == chromosome:
                    chr_start = int(line2[1])
                    chr_end = int(line2[2])
                    with open(f"{file.replace('.bedGraph', '')}_{chromosome}.bedGraph", 'a+') as f2:
                        if chr_end - chr_start == 1:
                            f2.write(chromosome.replace('chrM', 'chrMtDNA') + '\t' + str(chr_end) + '\t' + line2[3] + '\n')
                        else:
                            for position in list(range(chr_start + 1, chr_end + 1)):
                                f2.write(chromosome + '\t' + str(position) + '\t' + line2[3] + '\n')

    def no_exist_conservation_socre_in_bedGraph(self, chr, position, f_transcript_conservation_score):  # I labeled '0' for individuals who do not have a conservation score in their genome.
        mux = pd.MultiIndex.from_arrays([[chr], [position]], names=[0, 1])
        df_if_conservation_score_not_exist = pd.DataFrame(0, index=mux, columns=[2])
        f_transcript_conservation_score = pd.concat(
            [f_transcript_conservation_score, df_if_conservation_score_not_exist])
        return f_transcript_conservation_score

class Database():
    def microRNA_database(self, input):  ## For analyzing the length of each miRNA\n",
        with open(input, 'r+') as f1:
            dict_miRNA, name1, seq1 = {}, '', ''
            for line1 in f1:
                if line1[0] == '>':
                    name1 = line1.strip()[1:]
                else:
                    seq1 = line1.strip()
                    if ('microRNA' in name1) and (seq1 != ''):
                        dict_miRNA[name1.split('_')[2]] = seq1
        return dict_miRNA

    def microRNA_sequence_to_name_database_1st_18nt(self,input):  ## dictionary miRNA seq to name, miRNA length at least 18nt
        with open(input, 'r+') as f1:
            dict_miRNA, name1, seq1 = {}, '', ''
            for line1 in f1:
                if line1[0] == '>':
                    name1 = line1.strip().split(' ')[0][1:]
                else:
                    seq1_short = line1.strip()[:18]
                    seq1_raw = line1.strip()
                    name1_seq1raw = f"{name1}&{seq1_raw}"
                    if (('miR-' in name1) or ('let-' in name1) or ('Spike' in name1)) and (seq1_short != ''):
                        dict_miRNA[seq1_short] = dict_miRNA.get(seq1_short, '')
                        dict_miRNA[seq1_short] = (dict_miRNA[seq1_short] + '_' + name1_seq1raw).lstrip('_')
        return dict_miRNA

    def making_unique_redundant_database_hg38(self, input):
        normal_chromosome_list = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16',
                                  '17', '18', '19', '20', '21', '22', 'X', 'Y', 'MT']
        unchr_name = {'RNA5-8SN4', 'KIR3DS1', 'KIR2DS1', 'FAM8A5P', 'RNU1-79P', 'KIR2DS5', 'LILRA3', 'HLA-DRB8',
                      'OR8U9', 'KIR2DS3', 'MAFIP', 'CCL3L1', 'TAS2R45', 'PRSS3P2', 'CACNA1C-IT2', 'KIR2DL2', 'KIR2DS2',
                      'HLA-DRB7', 'KIR2DL5A', 'KIR2DL5B', 'RNA5-8SN5', 'C4B_2', 'HLA-DRB3', 'OR8U8', 'GTF2H2C_2',
                      'HLA-DRB2', 'HLA-DRB4', 'OR9G9', 'PRAMEF22', 'GSTT1', 'RNU1-116P'}
        dict_set = set()
        dict_gene_type = set()
        f2 = open(input.replace('.txt', '_human_unique.fasta'), 'w+')
        f3 = open(input.replace('.txt', '_human_redundant.fasta'), 'w+')
        # integrated_name = f'>{Gene_ID}_{Transcript_ID}_{Gene_name}#{Chromosome}#{exons_left_list}#{exons_right_list}#{strand}#{CDS_left}#{CDS_right}#{gene_type}_mRNA'
        with open(input, 'r+') as f1:
            integrated_name, sequence = '', ''
            for line1 in f1:
                if ('>' in line1):
                    if ('miRNA' not in integrated_name) and (integrated_name != ''):
                        tmp_chr = integrated_name.split('_')[2].split('#')[1]
                        if tmp_chr in normal_chromosome_list:
                            if sequence not in dict_set:
                                f2.write(integrated_name + '\n')
                                f2.write(sequence + '\n')
                                dict_set.add(sequence)
                            elif sequence in dict_set:
                                f3.write(integrated_name + '\n')
                                f3.write(sequence + '\n')
                        elif tmp_chr not in normal_chromosome_list:
                            if sequence not in dict_set:
                                f2.write(integrated_name + '\n')
                                f2.write(sequence + '\n')
                                dict_set.add(sequence)
                            elif sequence in dict_set:
                                f3.write(integrated_name + '\n')
                                f3.write(sequence + '\n')
                    line2 = line1.replace('_', '&').strip().split('|')
                    sequence = ''
                    Gene_ID = line2[0][1:]
                    Transcript_ID = line2[1]
                    gene_type = line2[2].replace('protein&coding', 'mRNA')
                    exons_left_list = line2[3]
                    exons_right_list = line2[4]
                    try:
                        CDS_left = min(int(x) for x in re.findall(r'\d+', line2[5]))
                        CDS_right = max(int(x) for x in re.findall(r'\d+', line2[6]))
                    except:
                        CDS_left, CDS_right = '0', '0'
                    strand = line2[7]
                    Chromosome = line2[8]
                    if len(line2) != 10:
                        Gene_name = 'NoName'
                    else:
                        Gene_name = line2[9]
                    dict_gene_type.add(gene_type)
                    integrated_name = f'>{Gene_ID}_{Transcript_ID}_{Gene_name}#{Chromosome}#{exons_left_list}#{exons_right_list}#{strand}#{CDS_left}#{CDS_right}#{gene_type}_mRNA'
                else:
                    sequence += line1.strip()
            if 'miRNA' not in integrated_name:
                tmp_chr = integrated_name.split('_')[2].split('#')[1]
                if tmp_chr in normal_chromosome_list:
                    if sequence not in dict_set:
                        f2.write(integrated_name + '\n')
                        f2.write(sequence + '\n')
                        dict_set.add(sequence)
                    elif sequence in dict_set:
                        f3.write(integrated_name + '\n')
                        f3.write(sequence + '\n')
        f2.close()
        f3.close()
        print(dict_gene_type)

    def making_unique_redundant_database_mm39(self, input):
        normal_chromosome_list = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16',
                                  '17', '18', '19', 'X', 'Y', 'MT']
        dict_set = set()
        dict_gene_type = set()
        f2 = open(input.replace('.txt', '_mm39_unique.fasta'), 'w+')
        f3 = open(input.replace('.txt', '_mm39_redundant.fasta'), 'w+')
        # integrated_name = f'>{Gene_ID}_{Transcript_ID}_{Gene_name}#{Chromosome}#{exons_left_list}#{exons_right_list}#{strand}#{CDS_left}#{CDS_right}#{gene_type}_mRNA'
        with open(input, 'r+') as f1:
            integrated_name, sequence = '', ''
            for line1 in f1:
                if ('>' in line1):
                    if ('miRNA' not in integrated_name) and (integrated_name != ''):
                        tmp_chr = integrated_name.split('_')[2].split('#')[1]
                        if tmp_chr in normal_chromosome_list:  # The newly generated mouse transcript database will not support genes that are not located on non-normal chromosomes.
                            if sequence not in dict_set:
                                f2.write(integrated_name + '\n')
                                f2.write(sequence + '\n')
                                dict_set.add(sequence)
                            elif sequence in dict_set:
                                f3.write(integrated_name + '\n')
                                f3.write(sequence + '\n')
                    line2 = line1.replace('_', '&').strip().split('|')
                    sequence = ''
                    Gene_ID = line2[0][1:]
                    Transcript_ID = line2[1]
                    gene_type = line2[2].replace('protein&coding', 'mRNA')
                    exons_left_list = line2[3]
                    exons_right_list = line2[4]
                    try:
                        CDS_left = min(int(x) for x in re.findall(r'\d+', line2[5]))
                        CDS_right = max(int(x) for x in re.findall(r'\d+', line2[6]))
                    except:
                        CDS_left, CDS_right = '0', '0'
                    strand = line2[7]
                    Chromosome = line2[8]
                    if len(line2) != 10:
                        Gene_name = 'NoName'
                    else:
                        Gene_name = line2[9]
                    dict_gene_type.add(gene_type)
                    integrated_name = f'>{Gene_ID}_{Transcript_ID}_{Gene_name}#{Chromosome}#{exons_left_list}#{exons_right_list}#{strand}#{CDS_left}#{CDS_right}#{gene_type}_mRNA'
                else:
                    sequence += line1.strip()
            if 'miRNA' not in integrated_name:
                tmp_chr = integrated_name.split('_')[2].split('#')[1]
                if tmp_chr in normal_chromosome_list:
                    if sequence not in dict_set:
                        f2.write(integrated_name + '\n')
                        f2.write(sequence + '\n')
                        dict_set.add(sequence)
                    elif sequence in dict_set:
                        f3.write(integrated_name + '\n')
                        f3.write(sequence + '\n')
        f2.close()
        f3.close()
        print(dict_gene_type)

    def making_unique_redundant_database_WBcel235(self, input):
        normal_chromosome_list = ['I', 'II', 'III', 'IV', 'V', 'X', 'MtDNA']
        dict_set = set()
        dict_gene_type = set()
        f2 = open(input.replace('.txt', '_WBcel235_unique.fasta'), 'w+')
        f3 = open(input.replace('.txt', '_WBcel235_redundant.fasta'), 'w+')
        # integrated_name = f'>{Gene_ID}_{Transcript_ID}_{Gene_name}#{Chromosome}#{exons_left_list}#{exons_right_list}#{strand}#{CDS_left}#{CDS_right}#{gene_type}_mRNA'
        with open(input, 'r+') as f1:
            integrated_name, sequence = '', ''
            for line1 in f1:
                if ('>' in line1):
                    if ('miRNA' not in integrated_name) and (integrated_name != ''):
                        tmp_chr = integrated_name.split('_')[2].split('#')[1]
                        if tmp_chr in normal_chromosome_list:  # The newly generated worm transcript database will not support genes that are not located on non-normal chromosomes.
                            if sequence not in dict_set:
                                f2.write(integrated_name + '\n')
                                f2.write(sequence + '\n')
                                dict_set.add(sequence)
                            elif sequence in dict_set:
                                f3.write(integrated_name + '\n')
                                f3.write(sequence + '\n')
                    line2 = line1.replace('_', '&').strip().split('|')
                    sequence = ''
                    Gene_ID = line2[0][1:]
                    Transcript_ID = line2[1]
                    gene_type = line2[2].replace('protein&coding', 'mRNA')
                    exons_left_list = line2[3]
                    exons_right_list = line2[4]
                    try:
                        CDS_left = min(int(x) for x in re.findall(r'\d+', line2[5]))
                        CDS_right = max(int(x) for x in re.findall(r'\d+', line2[6]))
                    except:
                        CDS_left, CDS_right = '0', '0'
                    strand = line2[7]
                    Chromosome = line2[8]
                    if len(line2) != 10:
                        Gene_name = 'NoName'
                    else:
                        Gene_name = line2[9]
                    dict_gene_type.add(gene_type)
                    integrated_name = f'>{Gene_ID}_{Transcript_ID}_{Gene_name}#{Chromosome}#{exons_left_list}#{exons_right_list}#{strand}#{CDS_left}#{CDS_right}#{gene_type}_mRNA'
                else:
                    sequence += line1.strip()
            if 'miRNA' not in integrated_name:
                tmp_chr = integrated_name.split('_')[2].split('#')[1]
                if tmp_chr in normal_chromosome_list:
                    if sequence not in dict_set:
                        f2.write(integrated_name + '\n')
                        f2.write(sequence + '\n')
                        dict_set.add(sequence)
                    elif sequence in dict_set:
                        f3.write(integrated_name + '\n')
                        f3.write(sequence + '\n')
        f2.close()
        f3.close()
        print(dict_gene_type)

    def making_transcript_sequence_genomeposition_conservation_database(self, genome_file, transcript_file, chr_name):
        dict_genome = self.loading_genome_database_as_dict(genome_file)
        dict_transcript = self.loading_transcript_databse(transcript_file)
        # f_bedGraph = pd.read_table(f'phyloP100way.bedGrph_chr{chr_name}.bedGraph', index_col=[0, 1], header=None)#human
        # f_bedGraph = pd.read_table(f'mm39.phyloP35way_chr{chr_name}.bedGraph', index_col=[0, 1], header=None)#mouse
        f_bedGraph = pd.read_table(f'ce11.phyloP135way_chr{chr_name}.bedGraph', index_col=[0, 1], header=None)# Worm

        output_file = f"{transcript_file.replace('.fasta', '_')}{chr_name}_conservation_score.txt"
        if os.path.exists(output_file):
            os.remove(output_file)

        f2 = open(output_file, 'a+')
        num1 = 0
        for transcript_name, sequence in dict_transcript.items():
            num1 += 1
            print(num1)
            if transcript_name.count('#') == 7:
                #target_chromosome = transcript_name.split('_')[2].split('#')[1].replace('MT', 'M')#human/mouse
                target_chromosome = transcript_name.split('_')[2].split('#')[1] # Worm
                target_exons_genome_start_sites = sorted(
                    int(x) for x in transcript_name.split('_')[2].split('#')[2].split(';'))
                target_exons_genome_end_sites = sorted(
                    int(x) for x in transcript_name.split('_')[2].split('#')[3].split(';'))
                target_all_sites = zip(target_exons_genome_start_sites,
                                       target_exons_genome_end_sites)  ## the number show the left and right location of each exon in the genome, 1st, this function is iterator
            else:
                target_chromosome = 'not exist'  ## i didn't label miRNA position in the genome
            target_position_in_genome = []
            target_sequence_in_genome = ''

            if target_chromosome == chr_name:
                for exon_sites in target_all_sites:
                    target_position_in_genome += list(range(exon_sites[0], exon_sites[
                        1] + 1))  ## target whole sequence location or position or site in the genome
                    target_sequence_in_genome += dict_genome[target_chromosome][exon_sites[0] - 1:exon_sites[
                        1]]  ## this sequence could same or reverse complementary of transcript (in the negative strand)
                target_position_in_genome_str = ','.join(
                    str(x) for x in target_position_in_genome)  ## switch target site from number to string in list
                transcripts_site_in_genome = list(map(lambda x: ('chr' + target_chromosome, int(x)),
                                                      target_position_in_genome))  ## e.g. ('2L', 42), in case some position not exist in the bedGraph
                f_transcript_conservation_score = pd.DataFrame()
                for chromosome_site in transcripts_site_in_genome:  ## chromosome site: e.g. ('2L', 42)
                    try:  # if conservation score exist in bedGraph
                        f_transcript_conservation_score = pd.concat(
                            [f_transcript_conservation_score, f_bedGraph.loc[[chromosome_site]]])
                    except:  # if conservation score not exist in bedGraph
                        f_transcript_conservation_score = BedGraph().no_exist_conservation_socre_in_bedGraph(
                            target_chromosome, chromosome_site[1], f_transcript_conservation_score)
                each_transcript_conservation_score = ','.join([str(x) for x in f_transcript_conservation_score[2]])
                f2.write('>' + transcript_name + '\n')  ## write transcript name
                f2.write(target_sequence_in_genome + '\n')
                f2.write(target_position_in_genome_str + '\n')  ## write transcript position from genome
                f2.write(each_transcript_conservation_score + '\n')
        f2.close()

    def loading_genome_database_as_dict(self, file):
        dict_genome = {}
        with open(file, 'r+') as f1:
            chromosome, sequence = '', ''
            for line1 in f1:
                if '>' == line1[0]:
                    if chromosome != '':
                        dict_genome[chromosome] = sequence
                    # chromosome = line1.split(' ')[0].strip('>').replace('MT', 'M') # Human/Mouse
                    chromosome = line1.split(' ')[0].strip('>') # Worm
                    sequence = ''
                else:
                    sequence += line1.strip()
            dict_genome[chromosome] = sequence
        return dict_genome

    def transcript_sequence_genomeposition_conservation_database(self, file):
        dict_CS = {}  ## the database including name, sequence, position and conservation score, the sequence from genome, could be reverse complementary from transcript
        with open(file, 'r+') as f1:
            for line1 in f1:
                if line1[0] == '>':
                    name1 = line1.strip()[1:]
                else:
                    dict_CS[name1] = dict_CS.get(name1, [])
                    dict_CS[name1].append(line1.strip())
        return dict_CS

    def loading_transcript_databse(self, file):
        dict_transcipts = {}  ## the databse including transcript, sequence
        with open(file, 'r+') as f1:
            for line1 in f1:
                if line1[0] == '>':
                    name1 = line1.strip()[1:]
                else:
                    dict_transcipts[name1] = (line1.strip())
        return dict_transcipts

    def sequence_name_database(self, file):  ## sequence as  key, name as item
        dict_seq_name = {}
        with open(file, 'r+') as f1:
            for line1 in f1:
                if line1[0] == '>':
                    name1 = line1.strip()[1:]
                else:
                    sequence = line1.strip()
                    dict_seq_name[sequence] = dict_seq_name.get(sequence, [])
                    dict_seq_name[sequence].append(name1)
        return dict_seq_name

    def unique_redundant_geneID_dict(self, unique_database, redundant_database):
        unique_redundant_name_dict1 = {}
        unique_transcripts = self.sequence_name_database(unique_database)
        redundant_transcripts = self.sequence_name_database(redundant_database)
        for seq, redundant_name_list in redundant_transcripts.items():
            unique_geneID = unique_transcripts[seq][0].split('_')[0]  # remove gene name, only keep gene_ID
            for redundant_name in redundant_name_list:
                redundant_geneID = redundant_name.split('_')[0]
                redundant_transcriptID = redundant_name.split('_')[1]
                redundant_strand = redundant_name.split('_')[2].split('#')[4]
                redundant_exon_min = min(int(x) for x in redundant_name.split('_')[2].split('#')[2].split(';'))
                redundant_exon_max = max(int(x) for x in redundant_name.split('_')[2].split('#')[3].split(';'))
                redundant_CDS_min = min(int(x) for x in redundant_name.split('_')[2].split('#')[5].split(';'))
                redundant_CDS_max = min(int(x) for x in redundant_name.split('_')[2].split('#')[6].split(';'))
                redundant_exon_range_str = f"{redundant_exon_min}-{redundant_exon_max}"
                redundant_CDS_range_str = f"{redundant_CDS_min}-{redundant_CDS_max}"
                if redundant_geneID != unique_geneID:
                    unique_redundant_name_dict1[unique_geneID] = unique_redundant_name_dict1.get(unique_geneID, {})
                    unique_redundant_name_dict1[unique_geneID][redundant_transcriptID] = unique_redundant_name_dict1[
                        unique_geneID].get(redundant_transcriptID, {'strand': '', 'exon_range': '', 'CDS_range': ''})
                    unique_redundant_name_dict1[unique_geneID][redundant_transcriptID]['strand'] = redundant_strand
                    unique_redundant_name_dict1[unique_geneID][redundant_transcriptID][
                        'exon_range'] = redundant_exon_range_str
                    unique_redundant_name_dict1[unique_geneID][redundant_transcriptID][
                        'CDS_range'] = redundant_CDS_range_str
        return unique_redundant_name_dict1

class Viennad_to_table():
    def __init__(self, transcript_ConservationScore_database=None, transcript_only_database=None):
        if transcript_ConservationScore_database is not None:
            self.dict_CS = Database().transcript_sequence_genomeposition_conservation_database(
                file=transcript_ConservationScore_database)
        if transcript_only_database is not None:
            self.dict_transcript = Database().loading_transcript_databse(file=transcript_only_database)

    def input_viennad(self, file):
        try:
            viennad_file = file + '.viennad'
            print(viennad_file)
            with open(viennad_file, 'r+') as f1:
                list_hyb = [] #将viennad文件每6行组合成一个list，代表每个hybrids所有信息，包括miRNA-target 信息，序列，basettern
                dict_hyb = {}
                no_exist_transcript_in_dict_cs = set()
                for line1 in f1:
                    line2 = line1.strip().split('_')
                    if len(line2) == 15:  # 对于hyb software，我用使用type=mim pref=mim，在viennad文件中，all microRNA on the left of hybrid
                        if (list_hyb != []) and (len(list_hyb[4].split('\t')) == 2) and ('microRNA' in list_hyb[0]) and (
                                'mRNA' in list_hyb[0]): # 在加载新的list_hyb之前，对前一个list_hyb进行分析，包括提取hybrid表达量，miRNA-target名字，基因组位置，RNA类型等信息
                            hyb_each_num = int(list_hyb[0].split('_')[1]) # 这个hybrids对应的的reads数目
                            miRNA_name = list_hyb[0].split('_')[4] #miRNA name
                            miRNA_seq = list_hyb[2].split('\t')[0].strip('-')  ##### miRNA sequence
                            miRNA_length = len(miRNA_seq) #计算miRNA长度
                            miRNA_pattern = list_hyb[4][:miRNA_length]  ##### 提取miRNA pattern
                            miRNA_pattern_short = miRNA_pattern.strip('.')  ## 仅仅提取miRNA配对的pattern，为什么做这个？用于计算左右两个有多少个碱基不能配对，然后后面计算target配对序列后，可以准备提取target与miRNA配对和不配对的序列 remove '.' in the  outside of '('
                            miRNA_pattern_short_pattern = ''.join('\\' + x for x in miRNA_pattern_short)
                            miRNA_unpaired_5prime_length = re.search(miRNA_pattern_short_pattern, miRNA_pattern).span()[0] #计算miRNA 序列5’端有几个碱基没有与target配对
                            miRNA_unpaired_3prime_length = miRNA_length - re.search(miRNA_pattern_short_pattern, miRNA_pattern).span()[1] #计算miRNA 序列3’端有几个碱基没有与target配对
                            gene_id = list_hyb[0].split('_')[9] # 基因ID，如ENSG
                            transcript_id = list_hyb[0].split('_')[10] # 基因转录本，如ENST
                            target_name = list_hyb[0].split('_')[11] # target name信息包括基因名字，genome信息，strand +or -， RNA类型, 如 MAP7D3#X#136246065;136220765;136244632;136224827;136219627;136225909;136222393;136246243;136230839;136241160;136251289;136240382;136236244;136231544;136230385;136227284;136228623#136246148;136220963;136244795;136224880;136219671;136226013;136222486;136246341;136230966;136241277;136251382;136240486;136236339;136232097;136230593;136227431;136228758#-1#136219627#136251358#mRNA
                            target_pattern_element_only = list_hyb[4].split('\t')[0][miRNA_length:].strip('.')  ##### target pattern，仅仅包括target 配对序列的pattern，不包括不和miRNA配对的pattern
                            target_pattern_element_only_format = ''.join('\\' + x for x in target_pattern_element_only)
                            target_seq_in_Viennad = list_hyb[3].split('\t')[0].strip('-')  ## 在viennad中， target所有序列，包括配对的序列以及以外更长的序列
                            target_pattern_in_Viennad = list_hyb[4].split('\t')[0][miRNA_length:] # Viennad中target的base pattern，包括配对的basepattern和以外的“.”
                            transcript_name = '_'.join([gene_id, transcript_id, target_name, 'mRNA'])#全面的转录本名字，包括基因ID，转录本ID，target名字和RNA类型？？ 这个transcript name 名字和 所使用的数据库名字 完全一样
                            target_seq_completed = '-' * 20 + self.dict_transcript[transcript_name] + '-' * 20  ## 直接对转录本的每个序列前后加上 20个“-”，以防某些转录本太短，当展示target序列的时候，就可以用“-”代替
                            target_seq_in_Viennad_start = (re.search(target_seq_in_Viennad, target_seq_completed).start()) # 找到viennad中target序列在基因组的位置，包括pairing的序列 和 pairing两边一些在viennad中存在的一些更长的pairing两边的序列
                            target_seq_in_Viennad_end = (re.search(target_seq_in_Viennad, target_seq_completed).end())
                            target_seq_in_Viennad_extend20nt = target_seq_completed[target_seq_in_Viennad_start - 20: target_seq_in_Viennad_end + 20] # 通过viennad文件中 target序列，然后提取转录本数据中更全的碱基序列，左右各延长20bp， 为什么干这个？因为有些viennad的target序列太短，为了使与miRNA配对的target 序列都存在，所以只能提取转录组中原始的target序列，在补齐 存在的短的target序列
                            target_pattern_in_Viennad_extended = '.' * 20 + target_pattern_in_Viennad + '.' * 20 # 在viennad文件的target pattern 两边又各加了20个 “.”
                            target_pattern_element_only_span = (re.search(target_pattern_element_only_format, target_pattern_in_Viennad_extended)).span() # 定位仅仅pairing的target序列 在 比Viennad原序列左右各延伸20bp碱基的target序列的准确 位置
                            target_start_num = target_pattern_element_only_span[0] - miRNA_unpaired_3prime_length # 定位target 与miRNA相关的碱基 （包括pairing的和 可能不paring的） 在 比Viennad原序列左右各延伸20bp碱基的target序列的准确 位置
                            target_end_num = target_pattern_element_only_span[1] + miRNA_unpaired_5prime_length
                            target_seq_element = target_seq_in_Viennad_extend20nt[target_start_num:target_end_num]  #### 提取target序列，包含pairing的和不pairing的
                            target_pattern_element = target_pattern_in_Viennad_extended[target_start_num:target_end_num] #### 提取target的basepattern，包含pairing的和不pairing的
                            strand = list_hyb[0].split('_')[11].split('#')[4] # 转录本 strand， + or -
                            energy = list_hyb[4].split('\t')[1][1:-1] #提取dG自由能

                            hyb_name = '_'.join(
                                [miRNA_name, miRNA_seq, miRNA_pattern, gene_id, transcript_id, target_name,
                                 target_seq_element, target_pattern_element, energy])
                            dict_hyb[hyb_name] = dict_hyb.get(hyb_name,
                                                              {'abundance': 0, 'conservation_score': set(),
                                                               'genome_position': set()})
                            if strand == '-1':
                                target_seq_in_Viennad = str(Seq(target_seq_in_Viennad).reverse_complement())
                                target_pattern_in_Viennad = target_pattern_in_Viennad[::-1]  ## for identify the paired nucleotides position in the genome
                            if transcript_name in self.dict_CS:
                                # print(line1.strip(),'aaa1')
                                # print(transcript_name,self.dict_CS[transcript_name][0],target_seq_in_Viennad,'aaa2')
                                target_position_in_genome_span = re.search(target_seq_in_Viennad,
                                                                           self.dict_CS[transcript_name][0]).span()
                                target_element_position = self.dict_CS[transcript_name][1].split(',')[
                                                          target_position_in_genome_span[0]:target_position_in_genome_span[1]]

                                target_element_conservation_score = [float(x) for x in
                                                                     self.dict_CS[transcript_name][2].split(',')[
                                                                     target_position_in_genome_span[0]:
                                                                     target_position_in_genome_span[1]]]
                                target_element_data = {'pattern': list(target_pattern_in_Viennad),
                                                       'genome_seq': list(target_seq_in_Viennad),
                                                       'position': target_element_position,
                                                       'CS': target_element_conservation_score}
                                target_element_dataframe = pd.DataFrame(data=target_element_data)
                                target_element_dataframe = target_element_dataframe[
                                    target_element_dataframe['pattern'] == ')']  ## remove unpaired position
                                target_element_only_conservation_score = {np.around(target_element_dataframe['CS'].mean(), decimals=2)}  ## conservation score without unpaired position
                                dict_hyb[hyb_name]['conservation_score'].update(target_element_only_conservation_score)
                                dict_hyb[hyb_name]['genome_position'].update(set(target_element_dataframe['position'])) # 计算target element 保守序性的时候，仅仅考虑配对的碱基，这里的postion也仅仅是配对的碱基
                            if (transcript_name not in self.dict_CS) and (
                                    transcript_name not in no_exist_transcript_in_dict_cs):
                                no_exist_transcript_in_dict_cs.add(transcript_name)
                                print(f"{transcript_name} is not in dict_CS")  ## no conservation socre out
                            dict_hyb[hyb_name]['abundance'] += hyb_each_num
                        list_hyb = []
                    list_hyb.append(line1.strip())
            f2 = open(viennad_file.replace('viennad', 'txt'), 'w+')
            f2.write(
                f'miRNA_name\tmiRNA_sequence\tmiRNA_pattern\tGene_ID\ttranscript_ID\tGene_information\telement_sequence\telement_pattern\tdG\tabundance\tgenome_position\tConservation_score\n')
            for name in dict_hyb:
                if dict_hyb[name][
                    'conservation_score'] == set():  # 保守性数据不存在，主要是18S，28S rRNA
                    f2.write('\t'.join(name.split('_')) + '\t' + str(dict_hyb[name]['abundance']) + '\n')
                elif dict_hyb[name]['conservation_score'] != set():
                    genome_position_str = str(sorted([int(x) for x in dict_hyb[name]['genome_position']]))
                    if len(dict_hyb[name]['conservation_score']) == 1: # 只有一个保守分数
                        f2.write('\t'.join(name.split('_')) + '\t' + str(
                            dict_hyb[name]['abundance']) + '\t' + genome_position_str + '\t' + str(
                            max(dict_hyb[name]['conservation_score'])) + '\n')
                    else:  # 尤其在果蝇基因组，there are multiple conservation scores, 0.1% type of  hybs have multiple CS, because their repetitive sequence in the genome. Ming and Nick suggest me to keep all those, but delete conservation score. Lable as multiple repetitive element.
                        f2.write(
                            '\t'.join(name.split('_')) + '\t' + str(dict_hyb[name]['abundance']) + '\t' + 'multiple_elements' + '\t' + str(max(dict_hyb[name]['conservation_score'])) + '\n')  # there are multiple element site in one transcript, i will put the largest conservation score, but i don't show the position
            f2.close()
            print("Step I done.\n")
        except Exception as e:
            traceback.print_exc()

    def basepattern_convert(self, index_nt_length, miRNA_seq, target_seq_reverse, miRNA_pattern, element_pattern_symmetry_reverse): # convert basepattern from branket "(" or ")" to "|"
        if miRNA_pattern[index_nt_length] == element_pattern_symmetry_reverse[index_nt_length]:
            if (miRNA_pattern[index_nt_length] == " ") and  (element_pattern_symmetry_reverse[index_nt_length] == " "):
                pass
            elif (miRNA_pattern[index_nt_length] == "|") and  (element_pattern_symmetry_reverse[index_nt_length] == "|"):
                # UG pairing
                if (target_seq_reverse[index_nt_length] == "G" and miRNA_seq[index_nt_length] == "T") or (target_seq_reverse[index_nt_length] == "T" and miRNA_seq[index_nt_length] == "G"):
                    miRNA_pattern = miRNA_pattern[:index_nt_length] + "." + miRNA_pattern[index_nt_length + 1:]
                    element_pattern_symmetry_reverse = element_pattern_symmetry_reverse[:index_nt_length] + "." + element_pattern_symmetry_reverse[index_nt_length + 1:]
                else: # Not UG pairing
                    pass
        elif miRNA_pattern[index_nt_length] != element_pattern_symmetry_reverse[index_nt_length]: # exist bulge
            if (miRNA_pattern[index_nt_length] == " ") and (element_pattern_symmetry_reverse[index_nt_length] == "|"):
                element_pattern_symmetry_reverse = element_pattern_symmetry_reverse[:index_nt_length] + " " + element_pattern_symmetry_reverse[index_nt_length:]
                target_seq_reverse = target_seq_reverse[:index_nt_length] + "-" + target_seq_reverse[index_nt_length:]
            elif (element_pattern_symmetry_reverse[index_nt_length] == " ") and (miRNA_pattern[index_nt_length] == "|"):
                miRNA_pattern = miRNA_pattern[:index_nt_length] + " " + miRNA_pattern[index_nt_length:]
                miRNA_seq = miRNA_seq[:index_nt_length] + "-" + miRNA_seq[index_nt_length:]
        index_nt_length += 1
        return (index_nt_length, miRNA_seq, target_seq_reverse, miRNA_pattern, element_pattern_symmetry_reverse)

    def file_Basepattern_FinalResult(self, inputFile):
        # Read the input file
        # Using header=[0] to ensure the first row is treated as headers
        basepattern_df = pd.read_table(inputFile, header=[0])
        
        # Initialize a list to collect processed rows
        # This is much faster than using pd.concat inside a loop (O(n) vs O(n^2))
        collected_rows = []

        # Iterate through each row of the input DataFrame
        for index_clashTable, row in basepattern_df.iterrows():
            dG = row["dG"]
            genome_position = row["genome_position"]
            gene_type = row["gene_type"]
            Chromosome = row["Chromosome"]
            abundance = row["abundance"]
            Target_site_region = row["Target_site_region"]
            Strand = row["Strand"]
            Gene_ID = row["Gene_ID"]

            # --- Robust Handling for genome_position ---
            # Check if genome_position is NaN (missing) or a number (float/int)
            # If it's NaN, convert to an empty string. If it's a number, force convert to string.
            # This prevents AttributeError: 'float' object has no attribute 'strip'
            if pd.isna(genome_position):
                genome_position = ""
            else:
                genome_position = str(genome_position)

            # Clean and normalize patterns
            # Replace '(' with '|' and '.' with ' ' for standard visualization
            miRNA_pattern = row["miRNA_pattern"].replace("(", "|").replace(".", " ")
            miRNA_name = row["miRNA_name"]
            miRNA_seq = row["miRNA_sequence"]
            Conservation_score = row["Conservation_score"]
            Gene_name = row["Gene_name"]

            # Process target pattern: reverse string, replace symbols
            element_pattern_symmetry_reverse = row["element_pattern"][::-1].replace(")", "|").replace(".", " ")
            target_seq = row["element_sequence"]
            target_seq_reverse = target_seq[::-1]

            # --- Alignment Logic ---
            # Adjust the alignment between miRNA and target sequences by adding gaps or spaces
            # so that their lengths and positions match perfectly for the pairing pattern
            index_nt_length = 0
            if len(miRNA_seq) < len(target_seq_reverse):
                while index_nt_length <= len(target_seq_reverse) - 1:
                    index_nt_length, miRNA_seq, target_seq_reverse, miRNA_pattern, element_pattern_symmetry_reverse = self.basepattern_convert(
                        index_nt_length, miRNA_seq, target_seq_reverse, miRNA_pattern,
                        element_pattern_symmetry_reverse)  # convert each base pattern
            elif len(miRNA_seq) >= len(target_seq_reverse):
                while index_nt_length <= len(miRNA_seq) - 1:
                    index_nt_length, miRNA_seq, target_seq_reverse, miRNA_pattern, element_pattern_symmetry_reverse = self.basepattern_convert(
                        index_nt_length, miRNA_seq, target_seq_reverse, miRNA_pattern,
                        element_pattern_symmetry_reverse)  # convert each base pattern
            
            # --- Determine Site Type (Seed Classification) ---
            # Logic validated as biologically correct:
            # 1. 8mer: positions 2-8 paired + position 1 is 'A' on target
            # 2. 7mer-m8: positions 2-8 paired
            # 3. 7mer-A1: positions 2-7 paired + position 1 is 'A' on target
            # 4. 6mer: positions 2-7 paired
            # 5. offset-6mer: positions 3-8 paired
            if miRNA_pattern[1:8].count("|") == 7 and target_seq_reverse[0] == "A":
                site_type = "8mer"
            elif miRNA_pattern[1:8].count("|") == 7:
                site_type = "7mer-m8"
            elif miRNA_pattern[1:7].count("|") == 6 and target_seq_reverse[0] == "A":
                site_type = "7mer-A1"
            elif miRNA_pattern[1:7].count("|") == 6:
                site_type = "6mer"
            elif miRNA_pattern[2:8].count("|") == 6:
                site_type = "offset-6mer"
            else:
                site_type = "non-canonical"

            # --- Process Genome Position ---
            # Remove brackets and split by comma
            genome_position_list = genome_position.strip("[]").split(", ")
            
            # Filter valid digits to avoid errors during min/max calculation
            numeric_positions = [int(num) for num in genome_position_list if num.isdigit()]
            
            try:
                # Replace semicolon with underscore for HTML/SQL compatibility
                Target_site_region = str(Target_site_region).replace(";", "_")
            except:
                pass

            # Calculate spaces for accurate genome coordinate mapping
            left_spaces = len(miRNA_pattern) - len(miRNA_pattern.lstrip())
            right_spaces = len(miRNA_pattern) - len(miRNA_pattern.rstrip())

            # Determine the exact genome coordinates for the target site
            if numeric_positions and ("multiple_elements" not in genome_position):
                if str(Strand) == "1":  # Positive strand
                    # Extend coordinates based on spaces in the alignment pattern
                    chr_genome_position1 = f"chr{Chromosome}:{min(numeric_positions) - right_spaces}-{max(numeric_positions) + left_spaces}"
                elif str(Strand) == "-1":  # Negative strand
                    chr_genome_position1 = f"chr{Chromosome}:{min(numeric_positions) - left_spaces}-{max(numeric_positions) + right_spaces}"
                else:
                    # Fallback if strand is unknown
                    chr_genome_position1 = f"chr{Chromosome}:unknown_strand"
            else:
                # Handle cases with multiple elements or missing position data
                if genome_position and any(c.isdigit() for c in genome_position):
                    chr_genome_position1 = f"chr{Chromosome}:{','.join(genome_position_list)}"
                else:
                    chr_genome_position1 = f"chr{Chromosome}:multiple element"

            # --- Construct the New Row ---
            # Using the new "Snake Case" naming convention without special characters
            new_row = {
                "miRNA_name": miRNA_name,
                "miRNA_seq_5p_3p": miRNA_seq,          # Updated name
                "pairing_pattern": miRNA_pattern,      # Updated name
                "target_seq_3p_5p": target_seq_reverse,# Updated name
                "conservation_score": Conservation_score, # Updated name
                "gene_name": Gene_name,
                "gene_id": Gene_ID,                    # Updated name
                "free_energy": dG,                     # Updated name
                "gene_type": gene_type,
                "strand" : Strand,
                "abundance": abundance,
                "target_site_region": Target_site_region,
                "chr_genome_position": chr_genome_position1,
                "site_type": site_type
            }

            # Append the dictionary to the list
            collected_rows.append(new_row)

        # Define output filename
        outputFile = inputFile.replace("_region.txt","_FinalResult.csv")
        
        # --- Create Final DataFrame ---
        # Define the column order explicitly with the new names
        columns_order = [
            "miRNA_name", 
            "miRNA_seq_5p_3p", 
            "pairing_pattern", 
            "target_seq_3p_5p", 
            "conservation_score", 
            "gene_name", 
            "free_energy", 
            "gene_type",
            "gene_id", 
            "strand", 
            "abundance", 
            "target_site_region", 
            "chr_genome_position", 
            "site_type"
        ]
        
        # Create DataFrame from the list of dictionaries
        new_df = pd.DataFrame(collected_rows, columns=columns_order)
        
        # Write to CSV without index
        new_df.to_csv(f'{outputFile}', index=False)
        print("Step V done.\n")

    def check_bartel_filters(self, row):
        """
        David Bartel Lab (Hall et al., NAR 2025) High-Confidence Criteria:
        1. Seed (nt 2-8): >= 4 continuous Watson-Crick matches ('|').
        2. 3' Region (nt 9-end): >= 10 continuous Watson-Crick matches ('|').
        3. Offset: -4 to +6.
        """
        try:
            mir_seq = str(row['miRNA_seq_5p_3p'])
            tar_seq = str(row['target_seq_3p_5p'])
            pattern = str(row['pairing_pattern'])

            # ==========================================================
            # Step 1: Find the boundary of nt 8 (tem_num)
            # ==========================================================
            # Logic: Iterate until we find the index covering the first 8 real nucleotides of miRNA
            tem_num = 8
            # Safety check: prevent infinite loop if seq is weirdly short or all gaps
            max_len = len(mir_seq)
            while tem_num <= max_len and len(mir_seq[:tem_num].replace("-","")) < 8:
                tem_num += 1
            
            if tem_num > max_len: return False

            # ==========================================================
            # Step 2: Strict Continuity Check
            # ==========================================================
            # Seed Region: pattern[1:tem_num] (corresponds to nt 2 to nt 8)
            # 3' Region: pattern[tem_num:] (corresponds to nt 9 to end)
            
            seed_region_pattern = pattern[1:tem_num]
            three_p_region_pattern = pattern[tem_num:]

            # Criteria 1: Seed must have "||||" (Strict, no spaces allowed)
            if "||||" not in seed_region_pattern:
                return False
            
            # Criteria 2: 3' must have "||||||||||" (Strict)
            if ("|" * 10) not in three_p_region_pattern:
                return False
            
            # ==========================================================
            # Step 3: Precise Offset Calculation (Spacer Length Difference)
            # ==========================================================
            
            # 1. Locate the END of the Seed Match
            # We look for the LAST occurrence of "||||" in the seed region
            rel_seed_end = seed_region_pattern.rfind("||||")
            
            # Absolute Index = Slice Start (1) + Relative Index + 3 (to get to the 4th pipe)
            real_seed_end_idx = 1 + rel_seed_end + 3 

            # 2. Locate the START of the 3' Match
            # We look for the FIRST occurrence of "||||||||||" in the 3' region
            rel_3p_start = three_p_region_pattern.find("|" * 10)
            
            # Absolute Index = Slice Start (tem_num) + Relative Index
            real_3p_start_idx = tem_num + rel_3p_start

            # 3. Extract the Spacer Segment
            # Range: From the character AFTER Seed Match to the character BEFORE 3' Match
            spacer_slice_start = real_seed_end_idx + 1
            spacer_slice_end = real_3p_start_idx
            
            # Logical check: 3' match should not start before seed match ends
            if spacer_slice_start > spacer_slice_end:
                return False

            # Extract segments from miRNA and Target (Since they are aligned)
            mir_spacer_segment = mir_seq[spacer_slice_start : spacer_slice_end]
            tar_spacer_segment = tar_seq[spacer_slice_start : spacer_slice_end]

            # 4. Calculate Biological Length (Remove gaps '-' and spaces ' ')
            # Note: Pattern spaces don't matter here, we count nucleotides in Sequence.
            len_mir_spacer = len(mir_spacer_segment.replace("-", "").replace(" ", ""))
            len_tar_spacer = len(tar_spacer_segment.replace("-", "").replace(" ", ""))

            # 5. Calculate Offset
            offset = len_tar_spacer - len_mir_spacer
            
            return -4 <= offset <= 6

        except Exception:
            # Return False for any unexpected data issues to avoid crashing
            return False

    def classify_confidence(self, row):
        canonical_types = ['8mer', '7mer-m8', '7mer-A1', '6mer', 'offset-6mer']
        
        # 1. Background Check
        g_type = str(row.get('gene_type', ''))
        # must be mRNA or ncRNA, then talk about High/Low
        is_target_gene = ("mRNA" in g_type) or ("ncRNA" in g_type if isinstance(g_type, str) else False)
        
        if not is_target_gene:
            return "" # Background -> Empty 
        
        # 2. High Confidence Check
        # A: Canonical Seed
        if row['site_type'] in canonical_types:
            return "high"
        
        # B: Non-canonical + P<0.01 + Bartel Rules
        try:
            p_val = row['piranha_peak_pvalue']
            #  p_val is number and less than 0.01
            if (not pd.isna(p_val)) and (float(p_val) < 0.01):
                # pass P-value and Bartel rules
                if self.check_bartel_filters(row):
                    return "high"
        except:
            pass
        # 3. Low Confidence
        return "low"

    def Annotate_Piranha(self, CSVinput, PeakBED):
        print("Running Annotate_Piranha...")
        print(f"Input CSV  = {CSVinput}")
        print(f"Peak BED   = {PeakBED}")

        # ---- 1. Build peak_dict ----
        peak_dict = {}

        with open(PeakBED) as f:
            for line in f:
                if line.strip() == "":
                    continue
                cols = line.strip().split("\t")
                chrom = cols[0].replace("chr", "")  # keep your original logic
                start = int(cols[1])
                end = int(cols[2])
                pval = float(cols[-1])

                if chrom not in peak_dict:
                    peak_dict[chrom] = []
                peak_dict[chrom].append([start, end, pval])

        # ---- 2. Read CSV ----
        df = pd.read_csv(CSVinput)

        # ---- 3. Prepare new column ----
        piranha_result = []
        buffer = 50  # keep your ±50bp extension

        # ---- Loop each row ----
        for i, row in df.iterrows():
            pos = row["chr_genome_position"]

            # invalid format
            if pd.isna(pos) or ":" not in pos or "-" not in pos:
                piranha_result.append("Not found")
                continue

            # example: chr2R:13329417-13329439
            chrom_part, range_part = pos.split(":")
            chrom = chrom_part.replace("chr", "")

            if "-" in range_part:
                t_start, _, t_end = range_part.rpartition("-")
            else:
                piranha_result.append("Not found")
                continue

            t_start = int(t_start)
            t_end = int(t_end)

            # no peak on that chromosome
            if chrom not in peak_dict:
                piranha_result.append("Not found")
                continue
            # ---- Overlap detection with buffer ----
            best_p = None
            for p_start, p_end, pval in peak_dict[chrom]:
                p_start_ext = p_start - buffer
                p_end_ext   = p_end + buffer

                if max(t_start, p_start_ext) <= min(t_end, p_end_ext):
                    if (best_p is None) or (pval < best_p):
                        best_p = pval
            if best_p is None:
                piranha_result.append("Not found")
            else:
                piranha_result.append(best_p)

        # ---- 4. Add new column ----
        df["piranha_peak_pvalue"] = piranha_result

        # [---- 5. Add Confidence Column 
        print("Adding Confidence Classification...")
        #  P-value must be digital
        df["piranha_peak_pvalue"] = pd.to_numeric(df["piranha_peak_pvalue"], errors='coerce')
        
        #  classify_confidence
        df['confidence'] = df.apply(self.classify_confidence, axis=1)

        # ---- 6. Save (Original Logic) ----
        outname = CSVinput.replace(".csv", "_with_piranha.csv")
        df.to_csv(outname, index=False)

        print(f"Done! New file saved as: {outname}")

class Combined_table():
    def __init__(self, replicates=2, outfile='out.csv'):
        self.replicates = replicates
        self.outfile = outfile

    def Concat_mirnaCount(self, JobIDinput):
        try:
            # Change to the appropriate directory
            print(f"miRNA count Concat in python3: {JobIDinput}")

            # Process total count files
            list_total = sorted(glob.glob("*totalCount.csv"))
            if list_total:
                f_total_all = pd.DataFrame()
                for each_file in list_total:
                    # Read CSV with 'miRNA_name' as index
                    f1 = pd.read_csv(each_file, index_col=[0])
                    f_total_all = pd.concat([f_total_all, f1], axis=1)
                f_total_all.to_csv('AllSample_RawCount.csv', index=True)
                print("Total count files concatenated into AllSample_RawCount.csv")
            else:
                print("No total count files found.")

            # Process isoform count files
            list_isoform = sorted(glob.glob("*Isoform_mirnaCount.csv"))
            if list_isoform:
                f_isoform_all = pd.DataFrame()
                for each_file in list_isoform:
                    # Read CSV with 'miRNA_name' and 'Sequence' as composite index
                    f1 = pd.read_csv(each_file, index_col=[0, 1])
                    f_isoform_all = pd.concat([f_isoform_all, f1], axis=1)
                f_isoform_all.to_csv('AllSample_Isoform_RawCount.csv', index=True)
                print("Isoform count files concatenated into AllSample_Isoform_RawCount.csv")
            else:
                print("No isoform count files found.")
        except Exception as e:
            print(f"An error occurred in miRNA count Concat step: {e}")

    def rnaseqTPM_merge(self, JobID1, species1):
        try:
            print(f"rnaseqTPM_merge: {JobID1}")
            all_tpm_tables = glob.glob("*.sortBypos.table")

            f_all = pd.DataFrame()
            for each_file in sorted(all_tpm_tables):
                f1 = pd.read_table(each_file)
                f1 = f1.sort_values(by='TPM', ascending=False).drop_duplicates(subset=['Gene ID'], keep='first')
                f1 = f1.set_index('Gene ID')
                tpm_values = f1['TPM']
                new_column_name = each_file.replace(".sortBypos.table", "")
                tpm_values.rename(new_column_name, inplace=True)
                f_all = pd.concat([f_all, tpm_values], axis=1)

            f_all.index.set_names(['GeneID'], inplace=True)

            if species1 == "Human":
                f2 = pd.read_csv(f"/pubapps/mingyi.xie/clashhub/prod/app/RNAseqGenomeDB/Hisat2_Hg38/human_geneIDNameType.csv",index_col=[0])  # human geneID name
            elif species1 == "Mouse":
                f2 = pd.read_csv(
                    f"/pubapps/mingyi.xie/clashhub/prod/app/RNAseqGenomeDB/Hisat2_Mouse/20240719Mouse_geneIDNameType.csv",
                    index_col=[0])  # mouse geneID name
            elif species1 == "Drosophila":
                f2 = pd.read_csv(
                    f"/pubapps/mingyi.xie/clashhub/prod/app/RNAseqGenomeDB/Hisat2_Drosophila2/20240719Drosophila_geneIDNameType.csv",
                    index_col=[0])  # fly geneID name
            elif species1 == "C.elegans":
                f2 = pd.read_csv(f"/pubapps/mingyi.xie/clashhub/prod/app/RNAseqGenomeDB/Hisat2_Celegans/20240719Celegans_geneIDNameType.csv",index_col=[0])  # Celegans geneID name

            f_all =pd.concat([f_all, f2], axis=1).reindex(f_all.index)

            f_all.to_csv("geneTPM.csv", index=True)  # 保存索引到文件中
            print("rnaseq merge done!")
        except Exception as e:
            print(f"An error occurred: {e}")

class Compressed_table():  # current, this code only surpport 1 abundance, because i want to sum all abundance of similiar element

    def miRNA_element_range(self, list1):
        list_cluster = []
        lowest_num, maximum_num = 0, 0
        for number1 in sorted(list(list1)):
            if (lowest_num == 0) and (maximum_num == 0):
                lowest_num, maximum_num = number1, number1
            else:
                if int(number1) - 1 == maximum_num:
                    maximum_num = int(number1)
                elif int(number1) - 1 != maximum_num:
                    cluster1 = f'{lowest_num}-{maximum_num}'
                    list_cluster.append(cluster1)
                    lowest_num, maximum_num = number1, number1
        cluster1 = f'{lowest_num}-{maximum_num}'
        list_cluster.append(cluster1)
        return list_cluster

    def compressed_each_element(self, dict1):
        highest_abundance_each_hyb = 0
        highest_abundance_hyb_name = ''
        total_abundance_each_hyb = 0
        for each_hyb, abundance in dict1.items():
            if highest_abundance_each_hyb < abundance:
                highest_abundance_each_hyb = abundance
                highest_abundance_hyb_name = each_hyb
            total_abundance_each_hyb += abundance
        return highest_abundance_hyb_name, total_abundance_each_hyb

    def compressed_same_index_table_to_dict(self, table, compressed_index):
        dict_compressed_table = {}
        for index1 in compressed_index:
            dict_compressed_table[index1] = int(table.loc[index1].sum())
        return dict_compressed_table

    def files(self, input):
        input_table = input + '.txt'
        output = input_table.replace('.txt', '_compressed.txt')
        if os.path.exists(output):
            os.remove(output)

        f1 = pd.read_table(input_table,
                           index_col=["miRNA_name", "miRNA_sequence", "miRNA_pattern", "Gene_ID",
                                      "element_sequence", "element_pattern", "dG",
                                      "genome_position", "Conservation_score"])
        mask_dG = f1.index.get_level_values('dG') <= -11.1
        f1 = f1[mask_dG]# 应用布尔索引，删除 dG > -11.1 的hybrids

        f1 = (f1[['Gene_information', 'abundance']])
        f1['Gene_name'] = f1['Gene_information'].str.split('#', expand=True)[0]
        f1['gene_type'] = f1['Gene_information'].str.split('#', expand=True)[7]
        f1['Chromosome'] = f1['Gene_information'].str.split('#', expand=True)[1]
        f1['Strand'] = f1['Gene_information'].str.split('#', expand=True)[4]
        f1.drop(columns=['Gene_information'], inplace=True)
        f1.set_index('gene_type', append=True, inplace=True)
        f1.set_index('Gene_name', append=True, inplace=True)
        f1.set_index('Chromosome', append=True, inplace=True)
        f1.set_index('Strand', append=True, inplace=True)

        ###### 这一部分代码就是提取所有的文件index， 然后来压缩相同类型的hybrids
        f_genome_position_NaN_index_compressed = set()  # index中存在 NaN 或者 “multiple_elements”， 这部分文件没有被压缩
        f_genome_position_NaN_index_compressed_str = set()  # the index is set as string, if not set as string, i found there can be same index1 in the set()
        f_normal_index_compressed = set()  # make a compressed list
        f_normal_index_compressed_str = set()  # the index is set as string, if not set as string, i found there can be same index1 in the set()
        for index1 in f1.index:
            if (np.nan in index1) or ('multiple_elements' in index1):
                if str(index1) not in f_genome_position_NaN_index_compressed_str:
                    f_genome_position_NaN_index_compressed_str.update({
                        str(index1)})  ## this set only for checking the index, if index name is same, do not put real index into f_genome_position_NaN_index_compressed
                    f_genome_position_NaN_index_compressed.update({index1})
            if (np.nan not in index1) and ('multiple_elements' not in index1):
                if str(index1) not in f_normal_index_compressed_str:
                    f_normal_index_compressed_str.update({str(index1)})
                    f_normal_index_compressed.update({index1})

        #######
        f_genome_position_NaN_index = list(f_genome_position_NaN_index_compressed)
        f_genome_position_NaN = (f1.loc[f_genome_position_NaN_index])
        dict_f_genome_position_NaN = self.compressed_same_index_table_to_dict(table=f_genome_position_NaN,
                                                                              compressed_index=f_genome_position_NaN_index)  ## compressecd multiple element and no genome position table
        #### 以下部分代码是先写入index 有NaA 或者 “Multiple index”的hyrbids，这部分hybrids没有被压缩
        f_output = open(output, 'a+')  ##output Nan conservation table
        f_output.write(
            f'miRNA_name\tmiRNA_sequence\tmiRNA_pattern\tGene_ID\telement_sequence\telement_pattern\tdG\tgenome_position\tConservation_score\tgene_type\tGene_name\tChromosome\tStrand\tabundance\n')
        for index1, abundance1 in dict_f_genome_position_NaN.items():  # miRNA_site_ranges_dict: {'137-148':{each_hyb: abundance}}
            each_hyb_list = [str(x) for x in index1]
            each_hyb = '\t'.join((each_hyb_list))
            f_output.write(f'{each_hyb}\t{abundance1}\n')
        f_output.close()

        ##### 以下这部分 是对于 绝大多数 的hybrids 进行潜在的 压缩
        f_normal_index_compressed = list(f_normal_index_compressed)
        f_normal = f1.loc[f_normal_index_compressed]  ##for most of hybrids, including genome position
        dict_f_normal = self.compressed_same_index_table_to_dict(table=f_normal,
                                                                 compressed_index=f_normal_index_compressed)
        dict_miRNA_target_chromosome_position = {}  ## 每个miRNA-target-染色体 作为一个整体， e.g. {'miRNA_target_chromosome': {3,4,5,6,7,8}'}，  目的是将一些 target element 残缺的序列合并到完整的miRNA-target hybrids 中去
        for index1, abundance in dict_f_normal.items():
            # for loop 1st, collect all miRNA binding position in the genome
            miRNA_name1 = index1[0]
            gene_id1 = index1[3]
            chromosome1 = index1[11]
            miRNA_geneID_chr = '_'.join([miRNA_name1, gene_id1, chromosome1])
            miRNA_site_genome_set = set(int(x) for x in re.findall(r'\d+', index1[7]))
            miRNA_site_genome_min = int(min(miRNA_site_genome_set))
            miRNA_site_genome_max = int(max(miRNA_site_genome_set))
            dict_miRNA_target_chromosome_position[miRNA_geneID_chr] = dict_miRNA_target_chromosome_position.get(
                miRNA_geneID_chr, set())
            dict_miRNA_target_chromosome_position[miRNA_geneID_chr].update(
                set(range(miRNA_site_genome_min,
                          miRNA_site_genome_max + 1)))  ## this miRNA element region including bulge position
        dict_hyb_abundance = {}  ## combine all hybrids in this dictionary, determine which is the highest abundance one element position in the genome, e.g. {'miRNA_target_chromosome': {'3452-3476': {hyb_name: abundance}}'}
        for index1, abundance in dict_f_normal.items():
            # for loop 2nd, collect each_hyb into element range e.g. {'3452-3476': {hyb_name: abundance}
            chromosome1 = index1[11]
            each_hyb_list = [str(x) for x in index1]
            each_hyb = '\t'.join(each_hyb_list)
            each_hyb_abundance = abundance
            element_position_in_genome = set([int(x) for x in re.findall(r'\d+', index1[7])])
            miRNA_name1 = index1[0]
            gene_id1 = index1[3]
            miRNA_geneID_chr = '_'.join([miRNA_name1, gene_id1, chromosome1])
            list_hyb_position = self.miRNA_element_range(dict_miRNA_target_chromosome_position[
                                                             miRNA_geneID_chr])  ## def, calculate the lowest and highest position in the genome, ['134-156', '167-178']
            for element_range in list_hyb_position:  ## e.g. element_range : '123-145'
                # inner of 2nd for loop
                miRNA_site_range_set = set(range(int(element_range.split('-')[0]), int(
                    element_range.split('-')[1]) + 1))  ##In the each_hyb, there could be multiple range e.g.(167-178),
                if miRNA_site_range_set.intersection(
                        element_position_in_genome) != set():  # Does the element binding site in each row & one of multiple element_range from genome
                    dict_hyb_abundance[miRNA_geneID_chr] = dict_hyb_abundance.get(miRNA_geneID_chr, {})
                    dict_hyb_abundance[miRNA_geneID_chr][element_range] = dict_hyb_abundance[miRNA_geneID_chr].get(
                        element_range, {})
                    dict_hyb_abundance[miRNA_geneID_chr][element_range][each_hyb] = \
                        dict_hyb_abundance[miRNA_geneID_chr][element_range].get(each_hyb, 0)
                    dict_hyb_abundance[miRNA_geneID_chr][element_range][each_hyb] += each_hyb_abundance
        f_output = open(output, 'a+')
        for miRNA_geneID_chr, element_ranges_dict in dict_hyb_abundance.items():
            for each_element_range, each_hyb_dict in element_ranges_dict.items():  ## element_ranges_dict: {'137-148':{each_hyb1: abundance,each1_hyb2: abundance2},' 152-167':{each_hyb: abundance} }
                highest_abundance_hyb_name = self.compressed_each_element(each_hyb_dict)[0]
                total_abundance_each_hyb = self.compressed_each_element(each_hyb_dict)[1]
                f_output.write(f'{highest_abundance_hyb_name}\t{total_abundance_each_hyb}\n')
        f_output.close()
        print("Step II done.\n")

    def potential_miRNA_identification(self, input,premiRNA_database):
        try:
            with open(f"{premiRNA_database}") as f1:
                contents = f1.read()
            f1 = pd.read_table(f"{input}_compressed.txt")

            for index, each_row in f1.iterrows():
                if each_row['element_sequence'] in contents:
                    f1.at[index, 'gene_type'] = 'miRNA_host_gene'

            # 保存新的 pandas table 文件
            f1.to_csv(f"{input}_miRNA_identification.txt", sep='\t', index=False)
            print("Step III done.\n")
        except Exception as e:
            logging.error("Error occurred during step III, potential miRNA identification", exc_info=True)
            raise

class Gene_region():
    def __init__(self, ensemble_database=None):
        self.ensemble_database = ensemble_database

    def geneID_transcriptID_CDS_exon(self, file):  # including CDS and exon position
        dict_geneID_transcriptID_CDS = {}
        with open(file, 'r+') as f1:
            for line1 in f1:
                if 'protein_coding' in line1:
                    line2 = line1.strip().split('|')
                    Gene_ID = line2[0][1:]
                    transcript_ID = line2[1]
                    strand = line2[7]
                    exon_left_list = line2[3]
                    exon_right_list = line2[4]
                    CDS_left_list = line2[5]
                    CDS_right_list = line2[6]
                    if CDS_left_list != '':
                        target_exons_genome_start_sites = sorted(
                            int(x) for x in exon_left_list.split(';'))
                        target_exons_genome_end_sites = sorted(
                            int(x) for x in exon_right_list.split(';'))
                        target_CDS_genome_start_sites = sorted(
                            int(x) for x in CDS_left_list.split(';'))
                        target_CDS_genome_end_sites = sorted(
                            int(x) for x in CDS_right_list.split(';'))

                        dict_geneID_transcriptID_CDS[Gene_ID] = dict_geneID_transcriptID_CDS.get(Gene_ID, {})
                        dict_geneID_transcriptID_CDS[Gene_ID][transcript_ID + '_' + strand] = dict_geneID_transcriptID_CDS[Gene_ID].get(transcript_ID + '_' + strand,
                                                                      {'CDSs': set(), 'Exons': set()})

                        for exon_each in zip(target_exons_genome_start_sites, target_exons_genome_end_sites):
                            dict_geneID_transcriptID_CDS[Gene_ID][transcript_ID + '_' + strand]['Exons'].update(
                                set(range(exon_each[0], exon_each[1] + 1)))
                        for CDS_each in zip(target_CDS_genome_start_sites, target_CDS_genome_end_sites):
                            dict_geneID_transcriptID_CDS[Gene_ID][transcript_ID + '_' + strand]['CDSs'].update(
                                set(range(CDS_each[0], CDS_each[1] + 1)))
        return dict_geneID_transcriptID_CDS

    def table(self, input):
        input_table = input + '_miRNA_identification.txt'
        output = input_table.replace('_miRNA_identification.txt', '_region.txt')
        if os.path.exists(output):
            os.remove(output)
        dict_cds = self.geneID_transcriptID_CDS_exon(file=self.ensemble_database)
        with open(input_table, 'r+') as f1:
            line1 = f1.readlines()
            line1st = line1[0]
            line_other = line1[1:]

        f2 = open(output, 'a+')
        f2.write(line1st.rstrip('\n') + '\t' + 'Target_site_region' + '\n')
        for each_row in line_other:
            index1 = each_row.rstrip('\n').split('\t')
            element_position = set(int(x) for x in re.findall(r'\d+', index1[7]))
            list_region = []
            geneID = index1[3]
            if (element_position != set()) and ('mRNA' == index1[9]):
                if geneID in dict_cds:
                    transcriptName_list = dict_cds[geneID]
                    for transcriptName_strand in transcriptName_list:
                        strand = transcriptName_strand.split('_')[1]
                        CDS_region_set = dict_cds[geneID][transcriptName_strand]['CDSs']
                        exon_region_set = dict_cds[geneID][transcriptName_strand]['Exons']
                        if exon_region_set.intersection(
                                element_position) != set():  ## the element in the exon region, cds or utr,
                            if CDS_region_set.intersection(
                                    element_position) != set():  # the transcript exon in genome should overlap with target element
                                list_region.append('CDS')
                            if strand == '-1':
                                if max(element_position) < min(CDS_region_set):
                                    list_region.append('3UTR')
                                if min(element_position) > max(CDS_region_set):
                                    list_region.append('5UTR')
                            if strand == '1':
                                if min(element_position) > max(CDS_region_set):
                                    list_region.append('3UTR')
                                if max(element_position) < min(CDS_region_set):
                                    list_region.append('5UTR')
                    if list_region == []:
                        list_region.append(
                            'intron')  ## this is what i guess, some element in the exon, but not in all transcripts CDS
                    list_region_str = ';'.join(sorted(set(list_region)))
                    f2.write(each_row.rstrip('\n') + '\t' + str(list_region_str) + '\n')
                elif geneID not in dict_cds:  ## not mRNA
                    f2.write(f'{each_row}')
            else:
                f2.write(f'{each_row}')
        f2.close()
        print("Step IV done.\n")

class Statistic(): 
    def process_single_count_file(self, input_file, output_file, samples_list, annotation_df):
        if not os.path.exists(input_file):
            return 
        print(f"Processing {input_file} -> {output_file} ...")
        
        df = pd.read_csv(input_file, index_col=[0])
        
        try:
            common_samples = [s for s in samples_list if s in df.columns]
            if len(common_samples) > 0:
                df = df[common_samples]
            else:
                print(f"Warning: No matching columns found for {input_file}. Keeping original order.")
        except KeyError as e:
            print(f"Error reordering columns: {e}")
            
        df.index = df.index.str.split('|').str[0]
        df.index.name = 'GeneID'

        # sort by abundance
        df['temp_total_counts'] = df.sum(axis=1)
        df = df.sort_values(by='temp_total_counts', ascending=False)
        df = df.drop(columns=['temp_total_counts'])

        if annotation_df is not None:
            df = df.join(annotation_df, how='left')

        df.to_csv(output_file)
        print(f"Success: {output_file} generated.")

    def reorder_geneCountFileColumn(self):
        if not os.path.exists("coldata_SampleName.csv"):
            print("Error: coldata_SampleName.csv missing! Check sbatch script.")
            sys.exit(1)
            
        f1 = pd.read_csv("coldata_SampleName.csv", index_col=[0])
        samples_list = list(f1.index)
        
        annotation_df = None
        if os.path.exists("geneTPM.csv"):
            try:
                print("Loading annotations from geneTPM.csv...")
                tpm_df = pd.read_csv("geneTPM.csv")
                annotation_df = tpm_df[['GeneID', 'Combined']].drop_duplicates().set_index('GeneID')
            except Exception as e:
                print(f"Warning: Could not load annotations: {e}")        
        
        self.process_single_count_file("gene_count.csv", "gene_count_matrix.csv", samples_list, annotation_df)
        self.process_single_count_file("gene_count_eisa_exon.csv", "gene_count_eisa_exon_matrix.csv", samples_list, annotation_df)
        self.process_single_count_file("gene_count_eisa_intron.csv", "gene_count_eisa_intron_matrix.csv", samples_list, annotation_df)

    def miSeq_fasta_log(self, JobID1, Output_filename1):
        # 计算miRNA 最终有多少counts
        f1 = pd.read_csv(f"{Output_filename1}.mirnaCount.csv")
        total_raw_count = f1['rawCount'].sum()

        with open(f"/pubapps/mingyi.xie/clashhub/prod/slurmlogs/{JobID1}.log") as f1:
            allines = f1.read()
            log_data = {}
            log_data['Clean_fasta_reads_count'] = int(
                re.search(r'Total reads in the raw FASTA file is\s+([\d,]+)', allines).group(1).replace(',', ''))
            log_data['miRNAseq_count'] = total_raw_count

        # 生成readCounts表格
        readCounts_summary = pd.DataFrame({
            'Data type': ['Clean fasta', 'microRNA counts'],
            'Read Counts': [log_data['Clean_fasta_reads_count'], log_data['miRNAseq_count']]
        })
        readCounts_html_table = readCounts_summary.to_html(index=False, classes='table table-striped')

        # 生成readCounts的柱状图
        fig_log_summary = px.bar(readCounts_summary, x='Data type', y='Read Counts', title="Read Counts",
                                 text='Read Counts')
        fig_log_summary.update_layout(
            font=dict(
                family="Arial, sans-serif",
                size=16  # 设置统一的字体大小
            ),
            xaxis_title=None,
            yaxis_title=None,
            showlegend=False
        )
        readCount_html_barChart = fig_log_summary.to_html(full_html=False)

        # 绘制HTML模板
        template = Template("""

         <!DOCTYPE html>
         <html>
         <head>
             <title>CLASH Analysis Report</title>
             <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
             <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
             <style>
                 body {
                     font-family: Arial, sans-serif;
                     margin: 20px;
                     font-size: 16px; /* 设置统一的字体大小 */
                 }
                 h1, h2, ul {
                     font-size: 16px; /* 确保标题和列表的字体大小一致 */
                 }
                 h1 {
                     color: #333;
                     text-align: center; /* 居中对齐 */
                     font-size: 24px; /* 加大字体 */
                     font-weight: bold; /* 加粗 */
                 }
                 h2 {
                     color: #333;
                 }
                 table {
                     width: 100px; /* 设置整个表格的宽度 */
                     text-align: left;
                     table-layout: fixed; /* 确保表格布局固定 */
                 }
                 table th, table td {
                     text-align: left; /* 设置表头左对齐 */
                     width: 20px; /* 设置每列固定宽度 */
                 }
                 .row {
                     margin-bottom: 20px; /* 增加行之间的间距 */
                 }
             </style>
         </head>
         <body>
             <h1>CLASH Analysis Report for Job ID: {{ JobID1 }}</h1>

             <div class="row" style="display: flex; align-items: center;">
                 <div class="col-md-6">
                     <h2>Data Processing Summary</h2>
                     <table class="table table-striped data-summary">
                         {{ readCounts_html_table_content | safe }}
                     </table>
                 </div>
                 <div class="col-md-6">
                     <div>{{ readCount_html_barChart_content | safe }}</div>
                 </div>
             </div>
         </body>
         </html>


         """)

        # 渲染HTML
        html_content = template.render(
            JobID1=JobID1,
            readCounts_html_table_content=readCounts_html_table,
            readCount_html_barChart_content=readCount_html_barChart,
        )

        with open(f"{Output_filename1}_analysis_report.html", "w") as f:
            f.write(html_content)

        print("HTML report generated successfully.")

    def aqPE_data_report(self, JobID1):
        try:
            jobID = JobID1
            f1 = pd.read_csv(f"AllSample_RawCount.csv", index_col=[0])
            miRNA_total_final_count = (f1.sum())# 计算miRNA 最终有多少counts
            with open(f"/pubapps/mingyi.xie/clashhub/prod/slurmlogs/{JobID1}.log") as log_file:
                log_content = log_file.read()
            output_file_name_list = re.findall(r'output file name:\s*([\w\-\.]+)', log_content, re.MULTILINE)
            total_reads_list = [int(x.replace(',', ''))  for x in
                                re.findall(r'Total read pairs processed:\s+([\d,]+)', log_content, re.MULTILINE)]
            trimmed_reads_list = [int(x.replace(',', ''))  for x in
                                  re.findall(r'Pairs written \(passing filters\):\s+([\d,]+)', log_content,
                                             re.MULTILINE)]

            collapsed_reads_list = [int(x.replace(',', '')) for x in
                                    re.findall(r'Reads written \(passing filters\):\s+([\d,]+)', log_content,
                                               re.MULTILINE)]

            species = re.search(r"miR-seq Species: ([\w\.]+)", log_content).group(1)
            email = re.search(r"miR-seq email: ([\w@.]+)", log_content).group(1)
            adapter_5_prime = re.findall(r'Five Prime Adapter: (\w+)', log_content,
                                         re.MULTILINE)
            adapter_3_prime = re.findall(r'Three Prime Adapter: (\w+)', log_content,
                                         re.MULTILINE)
            
            input1_files = [m[1] for m in re.findall(r'Input fastq1:\s+/pubapps/mingyi\.xie/clashhub/(dev|prod)/app/TemporaryStorage/[\w\-]+/([\w\-\.]+\.fastq\.gz)',log_content,re.MULTILINE)]
            input2_files = [m[1] for m in re.findall(r'Input fastq2:\s+/pubapps/mingyi\.xie/clashhub/(dev|prod)/app/TemporaryStorage/[\w\-]+/([\w\-\.]+\.fastq\.gz)',log_content,re.MULTILINE)]

            miRNA_final_count_list = [miRNA_total_final_count[each_output] for each_output in output_file_name_list]

            print(f"Your email: {email}")
            print(f"Your species: {species}")
            print(f"Each of your input fastq1 name: {input1_files}")
            print(f"Each of your input fastq2 name: {input2_files}")
            print(f"Each of your input 5' adapter: {adapter_5_prime}")
            print(f"Each of your input 3' adapter: {adapter_3_prime}")
            print(f"Each of your raw reads number: {total_reads_list}")
            print(f"Each of your trimmed reads number: {trimmed_reads_list}")
            print(f"Each of your collapsed reads number: {collapsed_reads_list}")
            print(f"Each of your output file name: {output_file_name_list}")
            print(f"Each of miRNA final coubt: {miRNA_final_count_list}")

            # 创建DataFrame
            data = {
                'Sample': output_file_name_list,
                'Input File1': input1_files,
                'Input File2': input2_files,
                '5\' adapter': adapter_5_prime,
                '3\' adapter': adapter_3_prime,
                'Total Reads': total_reads_list,
                'Trimmed Reads': trimmed_reads_list,
                'Collapsed Reads': collapsed_reads_list,
                'Aligned Reads': miRNA_final_count_list
            }

            df = pd.DataFrame(data)

            # 只显示Total Reads, Trimmed Reads, Aligned Reads数据的柱状图
            df_melted = df.melt(id_vars=['Sample'], value_vars=['Total Reads', 'Trimmed Reads','Collapsed Reads', 'Aligned Reads'],
                                var_name='Read Type', value_name='Read Counts')
            fig = px.bar(df_melted, x='Sample', y='Read Counts', color='Read Type', barmode='group',
                         title='Read Counts Barchart', text='Read Counts')
            fig.update_layout(
                font=dict(
                    family="Arial, sans-serif",
                    size=16
                ),
                xaxis_title=None,
                yaxis_title=None,
                showlegend=True
            )
            readCount_html_barChart = fig.to_html(full_html=False)

            # 生成HTML内容模板
            template = Template("""
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>miRNA-seq Report</title>
                            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
                            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
                            <style>
                                body {
                                    font-family: Arial, sans-serif;
                                    margin: 20px;
                                    font-size: 16px;
                                }
                                h1 {
                                    color: #333;
                                    text-align: center;
                                    font-size: 24px;
                                    font-weight: bold;
                                }
                                h2 {
                                    color: #333;
                                    font-size: 18px;
                                }
                                table {
                                    width: 100%;
                                    text-align: left;
                                    table-layout: auto;
                                }
                                table th, table td {
                                    text-align: left;
                                }
                                table th {
                                    background-color: white;
                                    color: #333;
                                    border-bottom: 2px solid #dee2e6;
                                }
                                .row {
                                    margin-bottom: 20px;
                                }
                                .chart-container img {
                                    max-width: 100%;
                                    height: auto;
                                }
                                .table-striped tbody tr:nth-of-type(odd) {
                                    background-color: rgba(0, 0, 0, 0.05);
                                }
                            </style>
                        </head>
                        <body>
                            <h1>miRNA-seq Analysis Report for Job ID: {{ jobID }}</h1>
                            <div class="row" style="display: flex; align-items: center;">
                                <div class="col-md-6">
                                    <div class="row" style="display: flex; margin-bottom: 10px;">
                                        <div class="col-md-4" style="font-weight: bold;">Your email</div>
                                        <div class="col-md-8">{{ email }}</div>
                                    </div>
                                    <div class="row" style="display: flex; margin-bottom: 10px;">
                                        <div class="col-md-4" style="font-weight: bold;">Your species</div>
                                        <div class="col-md-8">{{ species }}</div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div>{{ readCount_html_barChart_content | safe }}</div>
                                </div>
                            </div>

                            <h2>Data Processing Summary</h2>
                            <table class="table table-striped">
                                {{ table_content }}
                            </table>

                        </body>
                        </html>
                        """)

            # 渲染HTML
            html_content = template.render(
                jobID=jobID,
                email=email,
                species=species,
                input1_files=input1_files,
                input2_files=input2_files,
                adapter_5_prime=adapter_5_prime,
                adapter_3_prime=adapter_3_prime,
                samples_list=output_file_name_list,
                table_content=df.to_html(classes='table table-striped', index=False, escape=False),
                readCount_html_barChart_content=readCount_html_barChart
            )

            # 保存HTML内容到文件
            with open('mirnaseq_analysis_report.html', 'w') as f:
                f.write(html_content)

            print("HTML report generated successfully from python code.")
        except Exception as e:
            print(f"An error occurred: {e}")

    def aqSE_data_report(self, JobID1):
        try:
            jobID = JobID1

            f1 = pd.read_csv(f"AllSample_RawCount.csv", index_col=[0])
            miRNA_total_final_count = (f1.sum())# 计算miRNA 最终有多少counts
            with open(f"/pubapps/mingyi.xie/clashhub/prod/slurmlogs/{JobID1}.log") as log_file:
                log_content = log_file.read()
            output_file_name_list = re.findall(r'output file name:\s*([\w\-\.]+)', log_content, re.MULTILINE)
            total_reads_list = [int(x.replace(',', ''))  for x in
                                re.findall(r'Total reads processed:\s+([\d,]+)', log_content, re.MULTILINE)][0::2]# 因为有cutadapt -u 4 -u 4，要去掉这些，所以用了[0::2]
            trimmed_reads_list = [int(x.replace(',', ''))  for x in
                                  re.findall(r'Reads written \(passing filters\):\s+([\d,]+)', log_content, re.MULTILINE)][0::2] # 因为有cutadapt -u 4 -u 4，要去掉这些，所以用了[0::2]
            collapsed_reads_list = [int(x.replace(',', '')) for x in
                                  re.findall(r'Reads written \(passing filters\):\s+([\d,]+)', log_content,
                                             re.MULTILINE)][1::2]
            species = re.search(r"miR-seq Species: ([\w\.]+)", log_content).group(1)
            email = re.search(r"miR-seq email: ([\w@.]+)", log_content).group(1)
            adapter_3_prime = re.findall(r'Three Prime Adapter: (\w+)', log_content,
                                         re.MULTILINE)
            
            input1_files = [m[1] for m in re.findall(r'Input fastq1:\s+/pubapps/mingyi\.xie/clashhub/(dev|prod)/app/TemporaryStorage/[\w\-]+/([\w\-\.]+\.fastq\.gz)',log_content, re.MULTILINE)]

            miRNA_final_count_list = [int(miRNA_total_final_count[each_output]) for each_output in output_file_name_list]

            print(f"Your email: {email}")
            print(f"Your species: {species}")
            print(f"Each of your input fastq1 name: {input1_files}")
            print(f"Each of your input 3' adapter: {adapter_3_prime}")
            print(f"Each of your raw reads number: {total_reads_list}")
            print(f"Each of your trimmed reads number: {trimmed_reads_list}")
            print(f"Each of your collapsed reads number: {collapsed_reads_list}")
            print(f"Each of your output file name: {output_file_name_list}")
            print(f"Each of miRNA final count: {miRNA_final_count_list}")

            # 创建DataFrame
            data = {
                'Sample': output_file_name_list,
                'Input File1': input1_files,
                '3\' adapter': adapter_3_prime,
                'Total Reads': total_reads_list,
                'Trimmed Reads': trimmed_reads_list,
                'Collapsed Reads': collapsed_reads_list,
                'Aligned Reads': miRNA_final_count_list
            }

            df = pd.DataFrame(data)

            # 只显示Total Reads, Trimmed Reads, Aligned Reads数据的柱状图
            df_melted = df.melt(id_vars=['Sample'], value_vars=['Total Reads', 'Trimmed Reads','Collapsed Reads', 'Aligned Reads'],
                                var_name='Read Type', value_name='Read Counts')
            fig = px.bar(df_melted, x='Sample', y='Read Counts', color='Read Type', barmode='group',
                         title='Read Counts Barchart', text='Read Counts')
            fig.update_layout(
                font=dict(
                    family="Arial, sans-serif",
                    size=16
                ),
                xaxis_title=None,
                yaxis_title=None,
                showlegend=True
            )
            readCount_html_barChart = fig.to_html(full_html=False)

            # 生成HTML内容模板
            template = Template("""
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>miRNA-seq Report</title>
                            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
                            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
                            <style>
                                body {
                                    font-family: Arial, sans-serif;
                                    margin: 20px;
                                    font-size: 16px;
                                }
                                h1 {
                                    color: #333;
                                    text-align: center;
                                    font-size: 24px;
                                    font-weight: bold;
                                }
                                h2 {
                                    color: #333;
                                    font-size: 18px;
                                }
                                table {
                                    width: 100%;
                                    text-align: left;
                                    table-layout: auto;
                                }
                                table th, table td {
                                    text-align: left;
                                }
                                table th {
                                    background-color: white;
                                    color: #333;
                                    border-bottom: 2px solid #dee2e6;
                                }
                                .row {
                                    margin-bottom: 20px;
                                }
                                .chart-container img {
                                    max-width: 100%;
                                    height: auto;
                                }
                                .table-striped tbody tr:nth-of-type(odd) {
                                    background-color: rgba(0, 0, 0, 0.05);
                                }
                            </style>
                        </head>
                        <body>
                            <h1>miRNA-seq Analysis Report for Job ID: {{ jobID }}</h1>
                            <div class="row" style="display: flex; align-items: center;">
                                <div class="col-md-6">
                                    <div class="row" style="display: flex; margin-bottom: 10px;">
                                        <div class="col-md-4" style="font-weight: bold;">Your email</div>
                                        <div class="col-md-8">{{ email }}</div>
                                    </div>
                                    <div class="row" style="display: flex; margin-bottom: 10px;">
                                        <div class="col-md-4" style="font-weight: bold;">Your species</div>
                                        <div class="col-md-8">{{ species }}</div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div>{{ readCount_html_barChart_content | safe }}</div>
                                </div>
                            </div>

                            <h2>Data Processing Summary</h2>
                            <table class="table table-striped">
                                {{ table_content }}
                            </table>

                        </body>
                        </html>
                        """)

            # 渲染HTML
            html_content = template.render(
                jobID=jobID,
                email=email,
                species=species,
                input1_files=input1_files,
                adapter_3_prime=adapter_3_prime,
                samples_list=output_file_name_list,
                table_content=df.to_html(classes='table table-striped', index=False, escape=False),
                readCount_html_barChart_content=readCount_html_barChart
            )

            # 保存HTML内容到文件
            with open('mirnaseq_analysis_report.html', 'w') as f:
                f.write(html_content)

            print("HTML report generated successfully from python code.")
        except Exception as e:
            print(f"An error occurred: {e}")

    def aqCR_data_report(self, JobID1):
        try:
            jobID = JobID1

            f1 = pd.read_csv(f"AllSample_RawCount.csv", index_col=[0])
            miRNA_total_final_count = (f1.sum())# 计算miRNA 最终有多少counts
            with open(f"/pubapps/mingyi.xie/clashhub/prod/slurmlogs/{JobID1}.log") as log_file:
                log_content = log_file.read()
            output_file_name_list = re.findall(r'output file name:\s*([\w\-\.]+)', log_content, re.MULTILINE)
            total_reads_list = [int(x.replace(',', ''))  for x in
                                re.findall(r'Total reads in the raw FASTA file is\s+([\d,]+)', log_content, re.MULTILINE)]

            species = re.search(r"miR-seq Species: ([\w\.]+)", log_content).group(1)
            email = re.search(r"miR-seq email: ([\w@.]+)", log_content).group(1)
            input1_files = [m[1] for m in re.findall(r'Input fasta:\s+/pubapps/mingyi\.xie/clashhub/(dev|prod)/app/TemporaryStorage/[\w\-]+/([\w\-\.]+\.fasta\.gz)',log_content,re.MULTILINE)]

            miRNA_final_count_list = [miRNA_total_final_count[each_output] for each_output in output_file_name_list]

            print(f"Your email: {email}")
            print(f"Your species: {species}")
            print(f"Each of your input fasta name: {input1_files}")
            print(f"Each of your raw reads number: {total_reads_list}")
            print(f"Each of your output file name: {output_file_name_list}")
            print(f"Each of miRNA final count: {miRNA_final_count_list}")

            # 创建DataFrame
            data = {
                'Sample': output_file_name_list,
                'Input File1': input1_files,
                'Total Reads': total_reads_list,
                'Aligned Reads': miRNA_final_count_list
            }

            df = pd.DataFrame(data)

            # 只显示Total Reads, Trimmed Reads, Aligned Reads数据的柱状图
            df_melted = df.melt(id_vars=['Sample'], value_vars=['Total Reads', 'Aligned Reads'],
                                var_name='Read Type', value_name='Read Counts')
            fig = px.bar(df_melted, x='Sample', y='Read Counts', color='Read Type', barmode='group',
                         title='Read Counts Barchart', text='Read Counts')
            fig.update_layout(
                font=dict(
                    family="Arial, sans-serif",
                    size=16
                ),
                xaxis_title=None,
                yaxis_title=None,
                showlegend=True
            )
            readCount_html_barChart = fig.to_html(full_html=False)

            # 生成HTML内容模板
            template = Template("""
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>miRNA-seq Report</title>
                            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
                            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
                            <style>
                                body {
                                    font-family: Arial, sans-serif;
                                    margin: 20px;
                                    font-size: 16px;
                                }
                                h1 {
                                    color: #333;
                                    text-align: center;
                                    font-size: 24px;
                                    font-weight: bold;
                                }
                                h2 {
                                    color: #333;
                                    font-size: 18px;
                                }
                                table {
                                    width: 100%;
                                    text-align: left;
                                    table-layout: auto;
                                }
                                table th, table td {
                                    text-align: left;
                                }
                                table th {
                                    background-color: white;
                                    color: #333;
                                    border-bottom: 2px solid #dee2e6;
                                }
                                .row {
                                    margin-bottom: 20px;
                                }
                                .chart-container img {
                                    max-width: 100%;
                                    height: auto;
                                }
                                .table-striped tbody tr:nth-of-type(odd) {
                                    background-color: rgba(0, 0, 0, 0.05);
                                }
                            </style>
                        </head>
                        <body>
                            <h1>miRNA-seq Analysis Report for Job ID: {{ jobID }}</h1>
                            <div class="row" style="display: flex; align-items: center;">
                                <div class="col-md-6">
                                    <div class="row" style="display: flex; margin-bottom: 10px;">
                                        <div class="col-md-4" style="font-weight: bold;">Your email</div>
                                        <div class="col-md-8">{{ email }}</div>
                                    </div>
                                    <div class="row" style="display: flex; margin-bottom: 10px;">
                                        <div class="col-md-4" style="font-weight: bold;">Your species</div>
                                        <div class="col-md-8">{{ species }}</div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div>{{ readCount_html_barChart_content | safe }}</div>
                                </div>
                            </div>

                            <h2>Data Processing Summary</h2>
                            <table class="table table-striped">
                                {{ table_content }}
                            </table>

                        </body>
                        </html>
                        """)

            # 渲染HTML
            html_content = template.render(
                jobID=jobID,
                email=email,
                species=species,
                input1_files=input1_files,
                samples_list=output_file_name_list,
                table_content=df.to_html(classes='table table-striped', index=False, escape=False),
                readCount_html_barChart_content=readCount_html_barChart
            )

            # 保存HTML内容到文件
            with open('mirnaseq_analysis_report.html', 'w') as f:
                f.write(html_content)

            print("HTML report generated successfully from python code.")
        except Exception as e:
            print(f"An error occurred: {e}")

    def collapse_category(self, g):
        """
        Helper function: Simplify gene types (e.g., group all rRNAs together).
        Input: Gene type string
        Output: Simplified Gene type string
        """
        # Priority 1: any pseudogene-like category
        if "pseudogene" in g:
            return "pseudogene"
        # Priority 2: any rRNA-like category
        if ("&rRNA" in g) or (g == "rRNA") or ("Mt&rRNA" in g):
            return "rRNA"
        # Otherwise keep original category
        return g

    def generate_seed_energy_plots(self, df):
            """
            Helper function: Generate Plotly HTML for Seed Preference and Free Energy.
            Input: DataFrame containing 'site_type', 'free_energy'
            Output: (seed_html, energy_html)
            
            UPDATES:
            - Now calculates UNWEIGHTED counts (Unique Hybrids) instead of abundance-weighted sums.
            - Titles and Axis labels explicitly state "Unique Hybrids".
            """
            try:
                # --- Calculate Summary Statistics ---
                # N = Unique Hybrids (number of distinct rows in the provided dataframe)
                n_unique = len(df)
                
                # --- 1. Seed Preference Analysis (Based on UNIQUE HYBRIDS) ---
                # We count the frequency of each site_type row (Unweighted) to avoid jackpot bias.
                if 'site_type' in df.columns:
                    seed_df = df.groupby('site_type').size().reset_index(name='counts')
                    
                    # Define sort order (Canonical first)
                    seed_order = ['8mer', '7mer-m8', '7mer-A1', '6mer', 'offset-6mer', 'non-canonical']
                    seed_df['site_type'] = pd.Categorical(seed_df['site_type'], categories=seed_order, ordered=True)
                    seed_df = seed_df.sort_values('site_type')

                    # Title emphasizing Unique Hybrids
                    title_text = (
                        f"Seed Type Distribution (Unique Hybrids)<br>"
                        f"<span style='font-size: 13px; color: gray;'>"
                        f"N = {n_unique} Unique Interactions (Unweighted)"
                        f"</span>"
                    )

                    fig_seed = px.bar(seed_df, x='site_type', y='counts', 
                                    title=title_text,
                                    text='counts', color='site_type')
                    
                    fig_seed.update_layout(
                        font=dict(family="Arial, sans-serif", size=14),
                        showlegend=False,
                        xaxis_title=None,
                        yaxis_title="Count of Unique Hybrids", # Clear label: It's NOT abundance
                        title_x=0.5,
                        margin=dict(t=85)
                    )
                    seed_html = fig_seed.to_html(full_html=False)
                else:
                    seed_html = "<p>No site_type column found.</p>"

                # --- 2. Free Energy Distribution (Based on UNIQUE HYBRIDS) ---
                # dG distribution describes physical stability of unique hybrids.
                if 'free_energy' in df.columns:
                    df['free_energy'] = pd.to_numeric(df['free_energy'], errors='coerce')
                    df_clean = df.dropna(subset=['free_energy'])
                    
                    energy_title = (
                        f"Free Energy (dG) Distribution<br>"
                        f"<span style='font-size: 13px; color: gray;'>"
                        f"N = {len(df_clean)} Unique Interactions (Unweighted)"
                        f"</span>"
                    )

                    fig_energy = px.histogram(df_clean, x="free_energy", nbins=30,
                                            title=energy_title,
                                            marginal="box") 
                    
                    fig_energy.update_layout(
                        font=dict(family="Arial, sans-serif", size=14),
                        xaxis_title="Free Energy (kcal/mol)",
                        yaxis_title="Count of Unique Hybrids", # Clear label
                        showlegend=False,
                        title_x=0.5,
                        margin=dict(t=85)
                    )
                    energy_html = fig_energy.to_html(full_html=False)
                else:
                    energy_html = "<p>No Free_Energy column found.</p>"
                
                return seed_html, energy_html

            except Exception as e:
                print(f"Error generating seed/energy plots: {e}")
                return "<p>Error plotting seed</p>", "<p>Error plotting energy</p>"

    def CLASH_fastq_log(self, JobID1, Output_filename1):
            try:
                with open(f"/pubapps/mingyi.xie/clashhub/prod/slurmlogs/{JobID1}.log") as f1:
                    allines = f1.read()
                    log_data = {}
                    log_data['Raw_fastq_reads_count'] = int(
                        re.search(r'Total read pairs processed:\s+([\d,]+)', allines).group(1).replace(',', ''))
                    log_data['Raw_fastq_trimmed_reads_count'] = int(
                        re.search(r'Pairs written \(passing filters\):\s+([\d,]+)', allines).group(1).replace(',', ''))
                    log_data['Assembled_fastq_count'] = int(
                        re.search(r'Assembled reads\s+\.+:\s+([\d,]+)', allines).group(1).replace(',', ''))
                    log_data['Collapsed_fasta_count'] = int(
                        re.search(r'Total reads processed:\s+([\d,]+)', allines).group(1).replace(',', ''))

                # Generate readCounts table
                readCounts_summary = pd.DataFrame({
                    'Data type': ['Raw fastq', 'Adapter trimmed fastq', 'Assembled fastq', 'Collapsed fasta'],
                    'Read Counts': [log_data['Raw_fastq_reads_count'], log_data['Raw_fastq_trimmed_reads_count'],
                                    log_data['Assembled_fastq_count'], log_data['Collapsed_fasta_count']]
                })
                readCounts_html_table = readCounts_summary.to_html(index=False, classes='table table-striped')

                # Generate readCounts bar chart
                fig_log_summary = px.bar(readCounts_summary, x='Data type', y='Read Counts', title="Read Counts",
                                        text='Read Counts')
                fig_log_summary.update_layout(font=dict(family="Arial, sans-serif", size=16), xaxis_title=None,
                                            yaxis_title=None, showlegend=False)
                readCount_html_barChart = fig_log_summary.to_html(full_html=False)

                # Read the final result CSV
                f1 = pd.read_csv(f"{Output_filename1}_FinalResult_with_piranha.csv")
                
                # Ensure numeric columns
                f1["piranha_peak_pvalue"] = pd.to_numeric(f1["piranha_peak_pvalue"], errors="coerce")
                f1["free_energy"] = pd.to_numeric(f1["free_energy"], errors="coerce")
                
                # ======================================================
                # [Step 1] Split Data into 3 Groups
                # ======================================================
                
                total_unique_count = len(f1)

                # Check if 'confidence' column exists (Safety check)
                if 'confidence' not in f1.columns:
                    print("Error: 'confidence' column not found in CSV. Please ensure Annotate_Piranha ran successfully.")
                    # Fallback logic or return could go here, but usually we assume it exists
                
                # Group A: High Confidence
                # Logic: rows where confidence is explicitly "high"
                f1_high_confidence = f1[f1['confidence'] == 'high']
                
                # Group B: Background
                # Logic: rows where confidence is empty/NaN (Background)
                # Note: Pandas might read empty CSV strings as NaN
                f1_background = f1[(f1['confidence'].isna()) | (f1['confidence'] == '')]
                
                # Group C: Low Confidence (The rest)
                # Logic: rows where confidence is "low"
                low_conf_count = total_unique_count - len(f1_high_confidence) - len(f1_background)
                
                # Generate plots (Unweighted)
                seed_plot_HC, energy_plot_HC = self.generate_seed_energy_plots(f1_high_confidence)
                seed_plot_BG, energy_plot_BG = self.generate_seed_energy_plots(f1_background)
                
                # Calc stats
                hc_count = len(f1_high_confidence)
                bg_count = len(f1_background)
                
                hc_stats_text = f"N = {hc_count} ({hc_count/total_unique_count:.1%} of {total_unique_count})"
                bg_stats_text = f"N = {bg_count} ({bg_count/total_unique_count:.1%} of {total_unique_count})"
                total_stats_summary = f"Total Unique Hybrids Identified: {total_unique_count}"
                
                low_conf_percent = (low_conf_count/total_unique_count)*100
                footnote_text = (f"Note: The remaining <span style='color: #d9534f; font-weight: bold;'>{low_conf_percent:.1f}% ({low_conf_count})</span> "
                            f"consists of <b>Low-Confidence Interactions</b> (mRNA/ncRNA lacking canonical seeds AND failing to meet the combined P&lt;0.01 + "
                            f"structural criteria defined by <a href='https://academic.oup.com/nar/article/53/19/gkaf1018/8287596' target='_blank'>Hall et al., NAR 2025</a>) "
                            f"and are excluded from this comparison.")

                # ======================================================
                # [Step 2] Gene Type Distribution
                # ======================================================
                rna_all = (f1.groupby('gene_type')['abundance'].sum().reset_index().rename(
                    columns={'gene_type': 'Gene type', 'abundance': 'Total Read Counts'})) 

                rna_all['Gene type'] = rna_all['Gene type'].apply(self.collapse_category)
                rna_all = rna_all.groupby('Gene type', as_index=False)['Total Read Counts'].sum()
                rna_all = rna_all.sort_values(by='Total Read Counts', ascending=False)

                rnaType_html_table = rna_all.to_html(index=False, classes="table table-striped")

                fig = px.pie(rna_all, names='Gene type', values='Total Read Counts',
                            title='Gene Type Distribution (by Total Reads)')
                fig.update_layout(
                    font=dict(family="Arial, sans-serif", size=16),
                    showlegend=True, width=650, height=650, margin=dict(l=20, r=20, t=60, b=20),
                )
                rnaType_html_pieChart = fig.to_html(full_html=False)

                template = Template("""
                <!DOCTYPE html>
                <html>
                <head>
                    <title>CLASH Analysis Report</title>
                    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
                    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; font-size: 16px; color: #000000; }
                        h1 { color: #333; text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px;}
                        h2 { font-size: 20px; margin-top: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px; background-color: #f8f9fa; padding: 10px;}
                        table { width: 100%; }
                        .row { margin-bottom: 40px; }
                        .section-header { text-align:center; padding: 10px; margin-bottom: 15px; border-radius: 5px; color: white;}
                        .ref-link { color: white; text-decoration: underline; font-weight: bold; }
                        .ref-link:hover { color: #f8f9fa; }
                    </style>
                </head>
                <body>
                    <h1>CLASH Analysis Report for Job ID: {{ JobID1 }}</h1>

                    <div class="row">
                        <div class="col-md-6">
                            <h2>1. Data Processing Summary</h2>
                            {{ readCounts_html_table_content | safe }}
                        </div>
                        <div class="col-md-6">
                            <br><br>
                            {{ readCount_html_barChart_content | safe }}
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6">
                            <h2>2. Gene Type Distribution of Identified Hybrids</h2>
                            <p style="font-size:14px; color:#555;">
                                <i>Composition of all identified interactions (dG < -11.1 kcal/mol).</i>
                            </p>
                            {{ rnaType_html_table_content | safe }}
                        </div>
                        <div class="col-md-6">
                            {{ rnaType_html_pieChart_content | safe }}
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-12">
                            <h2>3. Interaction Analysis: Signal vs. Background</h2>
                            <p style="text-align:center; font-size:16px; font-weight:bold; color: #333; margin-bottom: 5px;">
                                {{ total_stats_summary }}
                            </p>
                            <p style="text-align:center; color: #555; margin-bottom: 15px;">
                                Comparison between <b>High Confidence Targets</b> and <b>Excluded Background RNAs</b> (Negative Control).
                            </p>
                            
                            <div style="background-color: #f8f9fa; border-top: 1px solid #ddd; padding: 15px; margin: 0 50px; border-radius: 5px;">
                                <p style="text-align:center; color: #333; font-size: 15px; margin: 0;">
                                    {{ footnote_text | safe }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="row" style="margin-top: 30px;">
                        <div class="col-md-6" style="border-right: 1px solid #ddd;">
                            
                            <div class="section-header" style="background-color: #28a745;">
                                <h4>High Confidence Targets</h4>
                                <p style="font-size:12px; margin:0;">Target: mRNA / ncRNA</p>
                                
                                <div style="font-size:11px; margin-top:8px; line-height:1.4;">
                                    <b>Criteria:</b> Canonical Seed OR Non-canonical sites satisfying:<br>
                                    (1) P &lt; 0.01 <b>AND</b> (2) Structural Rules (<a href="https://academic.oup.com/nar/article/53/19/gkaf1018/8287596" target="_blank" class="ref-link">Hall et al., NAR 2025</a>):<br>
                                    <i>(Seed match &ge; 4nt + 3' match &ge; 10nt + Offset -4 to +6)</i>
                                </div>

                                <p style="font-size:13px; margin-top:8px; font-weight:bold;">{{ hc_stats_text }}</p>
                            </div>
                            {{ seed_plot_HC | safe }}
                            {{ energy_plot_HC | safe }}
                        </div>

                        <div class="col-md-6">
                            <div class="section-header" style="background-color: #6c757d;">
                                <h4>Excluded Background RNAs</h4>
                                <p style="font-size:12px; margin:0;">Target: rRNA, tRNA, Pseudogenes, etc.</p>
                                <p style="font-size:12px; margin:0;">(Negative Control Analysis)</p>
                                <br> <p style="font-size:13px; margin-top:8px; font-weight:bold;">{{ bg_stats_text }}</p>
                            </div>
                            {{ seed_plot_BG | safe }}
                            {{ energy_plot_BG | safe }}
                        </div>
                    </div>

                </body>
                </html>
                """)

                html_content = template.render(
                    JobID1=JobID1,
                    readCounts_html_table_content=readCounts_html_table,
                    readCount_html_barChart_content=readCount_html_barChart,
                    rnaType_html_table_content=rnaType_html_table,
                    rnaType_html_pieChart_content=rnaType_html_pieChart,
                    seed_plot_HC=seed_plot_HC,
                    energy_plot_HC=energy_plot_HC,
                    hc_stats_text=hc_stats_text,
                    seed_plot_BG=seed_plot_BG,
                    energy_plot_BG=energy_plot_BG,
                    bg_stats_text=bg_stats_text,
                    total_stats_summary=total_stats_summary,
                    footnote_text=footnote_text
                )

                with open(f"{Output_filename1}_analysis_report.html", "w") as f:
                    f.write(html_content)

                print("HTML report generated successfully.")
            except Exception as e:
                logging.error("Error occurred during CLASH fastq HTML processing", exc_info=True)
                raise

    def CLASH_fasta_log(self, JobID1, Output_filename1):
            try:
                with open(f"/pubapps/mingyi.xie/clashhub/prod/slurmlogs/{JobID1}.log") as f1:
                    allines = f1.read()
                    log_data = {}
                    log_data['Clean_fasta_count'] = int(
                        re.search(r'Total reads in the raw FASTA file is\s+([\d,]+)', allines).group(1).replace(',', ''))

                clean_fasta_text = f"<p><b>Clean FASTA reads:</b> {log_data['Clean_fasta_count']}</p>"
                readCount_html_barChart = clean_fasta_text

                # ---- load FinalResult ----
                f1 = pd.read_csv(f"{Output_filename1}_FinalResult_with_piranha.csv")
                
                # Ensure numeric columns
                f1["piranha_peak_pvalue"] = pd.to_numeric(f1["piranha_peak_pvalue"], errors="coerce")
                f1["free_energy"] = pd.to_numeric(f1["free_energy"], errors="coerce")
                
                # ======================================================
                # [Step 1] Split Data into 3 Groups (Updated with P<0.01 AND Bartel Rules)
                # ======================================================
                
                total_unique_count = len(f1)

                # Check if 'confidence' column exists (Safety check)
                if 'confidence' not in f1.columns:
                    print("Error: 'confidence' column not found in CSV. Please ensure Annotate_Piranha ran successfully.")
                    # Fallback logic or return could go here, but usually we assume it exists
                
                # Group A: High Confidence
                # Logic: rows where confidence is explicitly "high"
                f1_high_confidence = f1[f1['confidence'] == 'high']
                
                # Group B: Background
                # Logic: rows where confidence is empty/NaN (Background)
                # Note: Pandas might read empty CSV strings as NaN
                f1_background = f1[(f1['confidence'].isna()) | (f1['confidence'] == '')]
                
                # Group C: Low Confidence (The rest)
                # Logic: rows where confidence is "low"
                low_conf_count = total_unique_count - len(f1_high_confidence) - len(f1_background)
                
                # Generate plots (Unweighted)
                seed_plot_HC, energy_plot_HC = self.generate_seed_energy_plots(f1_high_confidence)
                seed_plot_BG, energy_plot_BG = self.generate_seed_energy_plots(f1_background)
                
                # Calc stats
                hc_count = len(f1_high_confidence)
                bg_count = len(f1_background)
                
                hc_stats_text = f"N = {hc_count} ({hc_count/total_unique_count:.1%} of {total_unique_count})"
                bg_stats_text = f"N = {bg_count} ({bg_count/total_unique_count:.1%} of {total_unique_count})"
                total_stats_summary = f"Total Unique Hybrids Identified: {total_unique_count}"
                
                low_conf_percent = (low_conf_count/total_unique_count)*100
                footnote_text = (f"Note: The remaining <span style='color: #d9534f; font-weight: bold;'>{low_conf_percent:.1f}% ({low_conf_count})</span> "
                                f"consists of <b>Low-Confidence Interactions</b> (mRNA/ncRNA lacking canonical seeds AND failing to meet the combined P&lt;0.01 + "
                                f"structural criteria defined by <a href='https://academic.oup.com/nar/article/53/19/gkaf1018/8287596' target='_blank'>Hall et al., NAR 2025</a>) "
                                f"and are excluded from this comparison.")

                # ======================================================
                # [Step 2] Gene Type Distribution
                # ======================================================
                rna_all = (
                    f1.groupby("gene_type")["abundance"]
                    .sum().reset_index().rename(columns={"gene_type": "Gene type", "abundance": "Total Read Counts"})
                )
                rna_all["Gene type"] = rna_all["Gene type"].apply(self.collapse_category)
                rna_all = rna_all.groupby("Gene type", as_index=False)["Total Read Counts"].sum()
                rna_all = rna_all.sort_values(by="Total Read Counts", ascending=False)

                rnaType_html_table = rna_all.to_html(index=False, classes="table table-striped")

                fig = px.pie(rna_all, names="Gene type", values="Total Read Counts", 
                            title="Gene Type Distribution (by Total Reads)")
                fig.update_layout(
                    font=dict(family="Arial, sans-serif", size=16),
                    showlegend=True, width=650, height=650, margin=dict(l=20, r=20, t=60, b=20)
                )
                rnaType_html_pieChart = fig.to_html(full_html=False)

                template = Template("""
                <!DOCTYPE html>
                <html>
                <head>
                    <title>CLASH Analysis Report</title>
                    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
                    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; font-size: 16px; color: #000000; }
                        h1 { color: #333; text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px;}
                        h2 { font-size: 20px; margin-top: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px; background-color: #f8f9fa; padding: 10px;}
                        table { width: 100%; }
                        .row { margin-bottom: 40px; }
                        .section-header { text-align:center; padding: 10px; margin-bottom: 15px; border-radius: 5px; color: white;}
                        .ref-link { color: white; text-decoration: underline; font-weight: bold; }
                        .ref-link:hover { color: #f8f9fa; }
                    </style>
                </head>
                <body>
                    <h1>CLASH Analysis Report for Job ID: {{ JobID1 }}</h1>

                    <div class="row">
                        <div class="col-md-12">
                            <h2>1. Data Processing Summary</h2>
                            {{ readCount_html_barChart_content | safe }}
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6">
                            <h2>2. Gene Type Distribution of Identified Hybrids</h2>
                            <p style="font-size:14px; color:#555;">
                                <i>Composition of all identified interactions (dG < -11.1 kcal/mol).</i>
                            </p>
                            {{ rnaType_html_table_content | safe }}
                        </div>
                        <div class="col-md-6">
                            {{ rnaType_html_pieChart_content | safe }}
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-12">
                            <h2>3. Interaction Analysis: Signal vs. Background</h2>
                            <p style="text-align:center; font-size:16px; font-weight:bold; color: #333; margin-bottom: 5px;">
                                {{ total_stats_summary }}
                            </p>
                            <p style="text-align:center; color: #555; margin-bottom: 15px;">
                                Comparison between <b>High Confidence Targets</b> and <b>Excluded Background RNAs</b> (Negative Control).
                            </p>
                            
                            <div style="background-color: #f8f9fa; border-top: 1px solid #ddd; padding: 15px; margin: 0 50px; border-radius: 5px;">
                                <p style="text-align:center; color: #333; font-size: 15px; margin: 0;">
                                    {{ footnote_text | safe }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="row" style="margin-top: 30px;">
                        <div class="col-md-6" style="border-right: 1px solid #ddd;">
                            
                            <div class="section-header" style="background-color: #28a745;">
                                <h4>High Confidence Targets</h4>
                                <p style="font-size:12px; margin:0;">Target: mRNA / ncRNA</p>
                                
                                <div style="font-size:11px; margin-top:8px; line-height:1.4;">
                                    <b>Criteria:</b> Canonical Seed OR Non-canonical sites satisfying:<br>
                                    (1) P &lt; 0.01 <b>AND</b> (2) Structural Rules (<a href="https://academic.oup.com/nar/article/53/19/gkaf1018/8287596" target="_blank" class="ref-link">Hall et al., NAR 2025</a>):<br>
                                    <i>(Seed match &ge; 4nt + 3' match &ge; 10nt + Offset -4 to +6)</i>
                                </div>

                                <p style="font-size:13px; margin-top:8px; font-weight:bold;">{{ hc_stats_text }}</p>
                            </div>

                            {{ seed_plot_HC | safe }}
                            {{ energy_plot_HC | safe }}
                        </div>

                        <div class="col-md-6">
                            <div class="section-header" style="background-color: #6c757d;">
                                <h4>Excluded Background RNAs</h4>
                                <p style="font-size:12px; margin:0;">Target: rRNA, tRNA, Pseudogenes, etc.</p>
                                <p style="font-size:12px; margin:0;">(Negative Control Analysis)</p>
                                <br>
                                <p style="font-size:13px; margin-top:8px; font-weight:bold;">{{ bg_stats_text }}</p>
                            </div>
                            {{ seed_plot_BG | safe }}
                            {{ energy_plot_BG | safe }}
                        </div>
                    </div>

                </body>
                </html>
                """)

                html_content = template.render(
                    JobID1=JobID1,
                    readCount_html_barChart_content=readCount_html_barChart,
                    rnaType_html_table_content=rnaType_html_table,
                    rnaType_html_pieChart_content=rnaType_html_pieChart,
                    seed_plot_HC=seed_plot_HC,
                    energy_plot_HC=energy_plot_HC,
                    hc_stats_text=hc_stats_text,
                    seed_plot_BG=seed_plot_BG,
                    energy_plot_BG=energy_plot_BG,
                    bg_stats_text=bg_stats_text,
                    total_stats_summary=total_stats_summary,
                    footnote_text=footnote_text
                )

                with open(f"{Output_filename1}_analysis_report.html", "w") as f:
                    f.write(html_content)

                print("HTML report generated successfully.")
            except Exception as e:
                logging.error("Error occurred during CLASH fasta HTML processing", exc_info=True)
                raise

    def CLASH_data_report(self,JobID1, Output_filename1):
        if JobID1[:3] == "CLQ": # 这是 CLASH fastq
            self.CLASH_fastq_log(JobID1, Output_filename1)
        elif JobID1[:3] == "CLA": # 这是 CLASH fasta
            self.CLASH_fasta_log(JobID1, Output_filename1)

    def Deseq2_data_report(self, JobIDinput):
        jobID = JobIDinput

        f1 = pd.read_csv(f"coldata_SampleName.csv", index_col=[0]) # Read sample names
        samples_list = list(f1.index)

        with open(f"/pubapps/mingyi.xie/clashhub/prod/slurmlogs/{jobID}.log", 'r') as log_file: # Read log file
            log_content = log_file.read()

        # Extract read counts (Pairs)
        total_reads_list = [int(x.replace(',', '')) for x in
                            re.findall(r'Total read pairs processed:\s+([\d,]+)', log_content, re.MULTILINE)]
        trimmed_reads_list = [int(x.replace(',', '')) for x in
                              re.findall(r'Pairs written \(passing filters\):\s+([\d,]+)', log_content, re.MULTILINE)]

        # Extract alignment blocks
        sample_blocks = re.findall(r'Running HISAT2 for \w+.*?\n(.*?)\d+\.\d+% overall alignment rate', log_content,
                                   re.DOTALL)

        # Calculate total aligned reads (Pairs)
        def mapping_reads_number(block):
            paired_exactly_once = int(
                re.search(r'(\d+) \(\d+\.\d+%\) aligned concordantly exactly 1 time', block).group(1))
            paired_more_than_once = int(re.search(r'(\d+) \(\d+\.\d+%\) aligned concordantly >1 times', block).group(1))
            discordantly_once = int(re.search(r'(\d+) \(\d+\.\d+%\) aligned discordantly 1 time', block).group(1))
            unpaired_exactly_once = int(re.search(r'(\d+) \(\d+\.\d+%\) aligned exactly 1 time', block).group(1))
            unpaired_more_than_once = int(re.search(r'(\d+) \(\d+\.\d+%\) aligned >1 times', block).group(1))
            
            # Calculate as Pairs
            paired_aligned_reads = (paired_exactly_once + paired_more_than_once + discordantly_once) * 2
            unpaired_aligned_reads = unpaired_exactly_once + unpaired_more_than_once
            total_aligned_reads = int((paired_aligned_reads + unpaired_aligned_reads)/2) 
            return total_aligned_reads

        total_aligned_reads_list = [mapping_reads_number(block) for block in sample_blocks]

        # Calculate Aligned Ratio (vs Total)
        aligned_ratio_list = []
        for total, aligned in zip(total_reads_list, total_aligned_reads_list):
            if total > 0:
                ratio = (aligned / total) * 100
                aligned_ratio_list.append(round(ratio, 2))
            else:
                aligned_ratio_list.append(0.0)

        # ==========================================
        # Calculate Aligned Ratio (vs Trimmed)
        # ==========================================
        aligned_trimmed_ratio_list = []
        for trimmed, aligned in zip(trimmed_reads_list, total_aligned_reads_list):
            if trimmed > 0:
                ratio = (aligned / trimmed) * 100
                aligned_trimmed_ratio_list.append(round(ratio, 2))
            else:
                aligned_trimmed_ratio_list.append(0.0)
        # ==========================================

        # Calculate Exonic Rate (RSeQC Parsing)
        exonic_rates_list = []
        for sample in samples_list:
            rseqc_file = f"{sample}.read_distribution.txt"
            exonic_rate = 0.0
            if os.path.exists(rseqc_file):
                try:
                    with open(rseqc_file, 'r') as rf:
                        content = rf.read()
                        cds = 0; utr5 = 0; utr3 = 0; total_tags = 0
                        m_cds = re.search(r'CDS_Exons\s+\d+\s+(\d+)', content)
                        if m_cds: cds = int(m_cds.group(1))
                        m_5utr = re.search(r"5'UTR_Exons\s+\d+\s+(\d+)", content)
                        if m_5utr: utr5 = int(m_5utr.group(1))
                        m_3utr = re.search(r"3'UTR_Exons\s+\d+\s+(\d+)", content)
                        if m_3utr: utr3 = int(m_3utr.group(1))
                        m_total = re.search(r'Total Tags\s+(\d+)', content)
                        if m_total: total_tags = int(m_total.group(1))
                        
                        if total_tags > 0:
                            exonic_rate = ((cds + utr5 + utr3) / total_tags) * 100
                            exonic_rate = round(exonic_rate, 2)
                except Exception as e:
                    print(f"Error parsing RSeQC for {sample}: {e}")
            else:
                print(f"Warning: RSeQC file {rseqc_file} not found.")
            exonic_rates_list.append(exonic_rate)

        # Parse Metadata
        try:
            species = re.search(r"RNAseq Species: ([\w\.]+)", log_content).group(1)
            email = re.search(r"RNAseq email: ([\w@.]+)", log_content).group(1)
            control_count = re.search(r"RNAseq Control Sample Count: (\d+)", log_content).group(1)
            treatment_count = re.search(r"RNAseq Treatment Sample Count: (\d+)", log_content).group(1)
        except:
            species = "Unknown"; email = "Unknown"; control_count = "0"; treatment_count = "0"

        adapter_5_prime = re.findall(r'RNAseq_(?:control|treatment)_FIVE_PRIME_ADAPTER_\d+=(\w+)', log_content, re.MULTILINE)
        adapter_3_prime = re.findall(r'RNAseq_(?:control|treatment)_THREE_PRIME_ADAPTER_\d+=(\w+)', log_content, re.MULTILINE)
        input1_files = re.findall(r'RNAseq_(?:control|treatment)_INPUT_FILE1_\d+=.*/([\w.-]+)\.fastq\.gz', log_content, re.MULTILINE)
        input2_files = re.findall(r'RNAseq_(?:control|treatment)_INPUT_FILE2_\d+=.*/([\w.-]+)\.fastq\.gz', log_content, re.MULTILINE)

        # Preserve original prints
        print(f"Your email: {email}")
        print(f"Your species: {species}")
        print(f"Total of your control sample number: {control_count}")
        print(f"Total of your treatment sample number: {treatment_count}")
        print(f"Each of your input fastq1 name: {input1_files}")
        print(f"Each of your input fastq2 name: {input2_files}")
        print(f"Each of your input 5' adapter: {adapter_5_prime}")
        print(f"Each of your input 3' adapter: {adapter_3_prime}")
        print(f"Each of your output file name: {samples_list}")
        print(f"Each of your raw reads number: {total_reads_list}")
        print(f"Each of your trimmed reads number: {trimmed_reads_list}")
        print(f"Each of your aligned reads number: {total_aligned_reads_list}")

        # Create DataFrame (Updated Column Name)
        data = {
            'Sample': samples_list,
            'Type': ['control'] * int(control_count) + ['treatment'] * int(treatment_count),
            'Input File1': input1_files,
            'Input File2': input2_files,
            '5\' adapter': adapter_5_prime,
            '3\' adapter': adapter_3_prime,
            'Total Reads': total_reads_list,
            'Trimmed Reads': trimmed_reads_list,
            'Aligned Reads': total_aligned_reads_list,
            'Aligned/Total (%)': aligned_ratio_list,
            'Aligned/Trimmed (%)': aligned_trimmed_ratio_list,
            'Exonic Rate (%)': exonic_rates_list
        }

        df = pd.DataFrame(data)

        # Chart 1: Read Counts (Updated to include new column)
        df_melted = df.melt(id_vars=['Sample'], 
                            value_vars=['Total Reads', 'Trimmed Reads', 'Aligned Reads'],
                            var_name='Read Type', value_name='Read Counts')
        
        fig = px.bar(df_melted, x='Sample', y='Read Counts', color='Read Type', barmode='group',
                     title='Read Counts Barchart', text='Read Counts')
        fig.update_layout(
            font=dict(family="Arial, sans-serif", size=14),
            xaxis_title=None, yaxis_title=None, showlegend=True,
            margin=dict(l=20, r=20, t=40, b=20)
        )
        readCount_html_barChart = fig.to_html(full_html=False)

        # Chart 2: Exonic Rate QC
        fig_qc = px.bar(df, x='Sample', y='Exonic Rate (%)', 
                        title='Quality Control (Exonic Rate)', 
                        text='Exonic Rate (%)')
        fig_qc.update_traces(marker_color='#2ca02c') 
        
        fig_qc.add_hline(y=60, line_dash="dash", line_color="green", 
                annotation_text="PolyA Threshold (>60%)", 
                annotation_position="top right")
        
        fig_qc.add_hline(y=30, line_dash="dash", line_color="#ff7f0e", 
                annotation_text="Ribo-zero Threshold (>30%)", 
                annotation_position="bottom right")
        
        fig_qc.update_layout(
            yaxis_range=[0, 110],
            xaxis_title=None,
            font=dict(family="Arial, sans-serif", size=14),
            bargap=0.6, 
            margin=dict(l=20, r=20, t=40, b=20)
        )
        qc_html_barChart = fig_qc.to_html(full_html=False)

        # Generate HTML Template with Footnote
        template = Template("""
        <!DOCTYPE html>
        <html>
        <head>
            <title>RNA-seq Report</title>
            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; font-size: 16px; }
                h1 { color: #333; text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
                h2 { color: #333; font-size: 18px; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                table { width: 100%; text-align: left; table-layout: auto; }
                table th, table td { text-align: left; vertical-align: middle; }
                table td { word-wrap: break-word; word-break: break-all; white-space: normal; max-width: 180px; }
                table th { background-color: white; color: #333; border-bottom: 2px solid #dee2e6; }
                .meta-container { background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 20px; text-align: center; }
                .meta-item { display: inline-block; margin: 0 20px; font-size: 16px; }
                .table-striped tbody tr:nth-of-type(odd) { background-color: rgba(0, 0, 0, 0.05); }
                .footnote { font-size: 14px; color: #555; margin-top: 15px; padding: 10px; background-color: #f9f9f9; border-left: 4px solid #007bff; }
                .footnote ol { margin-bottom: 0; padding-left: 20px; }
                .footnote li { margin-bottom: 5px; }
            </style>
        </head>
        <body>
            <h1>RNA-seq Analysis Report for Job ID: {{ jobID }}</h1>
            
            <div class="meta-container">
                <span class="meta-item"><strong>Email:</strong> {{ email }}</span>
                <span class="meta-item"><strong>Species:</strong> {{ species }}</span>
            </div>

            <div class="row">
                <div class="col-md-8">
                    <div>{{ readCount_html_barChart_content | safe }}</div>
                </div>
                <div class="col-md-4">
                    <div>{{ qc_html_barChart_content | safe }}</div>
                </div>
            </div>

            <h2>Data Processing Summary</h2>
            <div class="table-responsive">
                <table class="table table-striped">
                    {{ table_content }}
                </table>
            </div>

            <div class="footnote">
                <strong>Note:</strong>
                <ol>    
                    <li><strong>Exonic Rate & QC Diagnosis:</strong> 
                        <ul>
                            <li><strong>PolyA-selected (>60%):</strong> High exonic rates are expected because this method captures <strong>mature mRNA</strong> (spliced), removing introns.</li>
                            <li><strong>Ribo-depletion (>30%):</strong> Lower exonic rates are normal because this method retains <strong>pre-mRNA and lncRNA</strong>, which contain significant amounts of <strong>intronic sequences</strong>.</li>
                            <li><strong>Warning:</strong> Abnormally low exonic rates (below these thresholds) often indicate <strong>genomic DNA (gDNA) contamination</strong> or severe sample degradation, leading to reads mapping to intergenic regions.</li>
                        </ul>
                    </li>
                </ol>
            </div>

        </body>
        </html>
        """)

        html_content = template.render(
            jobID=JobIDinput,
            email=email,
            species=species,
            control_count=control_count,
            treatment_count=treatment_count,
            input1_files=input1_files,
            input2_files=input2_files,
            adapter_5_prime=adapter_5_prime,
            adapter_3_prime=adapter_3_prime,
            samples_list=samples_list,
            table_content=df.to_html(classes='table table-striped', index=False, escape=False),
            readCount_html_barChart_content=readCount_html_barChart,
            qc_html_barChart_content=qc_html_barChart
        )

        with open('RNAseq_analysis_report.html', 'w') as f:
            f.write(html_content)

        print("HTML report generated successfully.")

    def GeneTPM_data_report(self, JobIDinput):
        try:
            jobID = JobIDinput
            samples_list = []
            if os.path.exists("sample_list.txt"):
                with open("sample_list.txt", 'r+') as f1:
                    for line1 in f1:
                        samples_list.append(line1.split(" ")[0])
            else:
                print("sample_list.txt not found.")
                return

            log_path = f"/pubapps/mingyi.xie/clashhub/prod/slurmlogs/{jobID}.log"
            if not os.path.exists(log_path):
                print(f"Log file not found: {log_path}")
                return
                
            with open(log_path, 'r') as log_file:
                log_content = log_file.read()

            # Extract read counts (Pairs)
            total_reads_list = [int(x.replace(',', '')) for x in
                                re.findall(r'Total read pairs processed:\s+([\d,]+)', log_content, re.MULTILINE)]
            trimmed_reads_list = [int(x.replace(',', '')) for x in
                                  re.findall(r'Pairs written \(passing filters\):\s+([\d,]+)', log_content, re.MULTILINE)]

            # Extract alignment blocks
            sample_blocks = re.findall(r'Running HISAT2 for \w+.*?\n(.*?)\d+\.\d+% overall alignment rate', log_content,
                                       re.DOTALL)

            # Calculate aligned reads (Pairs)
            def mapping_reads_number(block):
                paired_exactly_once = int(
                    re.search(r'(\d+) \(\d+\.\d+%\) aligned concordantly exactly 1 time', block).group(1))
                paired_more_than_once = int(re.search(r'(\d+) \(\d+\.\d+%\) aligned concordantly >1 times', block).group(1))
                discordantly_once = int(re.search(r'(\d+) \(\d+\.\d+%\) aligned discordantly 1 time', block).group(1))
                unpaired_exactly_once = int(re.search(r'(\d+) \(\d+\.\d+%\) aligned exactly 1 time', block).group(1))
                unpaired_more_than_once = int(re.search(r'(\d+) \(\d+\.\d+%\) aligned >1 times', block).group(1))
                
                paired_aligned_reads = (paired_exactly_once + paired_more_than_once + discordantly_once) * 2
                unpaired_aligned_reads = unpaired_exactly_once + unpaired_more_than_once
                total_aligned_reads = int((paired_aligned_reads + unpaired_aligned_reads)/2)
                return total_aligned_reads

            total_aligned_reads_list = [mapping_reads_number(block) for block in sample_blocks]

            # Calculate Aligned Ratio (vs Total)
            aligned_ratio_list = []
            for total, aligned in zip(total_reads_list, total_aligned_reads_list):
                if total > 0:
                    ratio = (aligned / total) * 100
                    aligned_ratio_list.append(round(ratio, 2))
                else:
                    aligned_ratio_list.append(0.0)

            # ==========================================
            # Calculate Aligned Ratio (vs Trimmed)
            # ==========================================
            aligned_trimmed_ratio_list = []
            for trimmed, aligned in zip(trimmed_reads_list, total_aligned_reads_list):
                if trimmed > 0:
                    ratio = (aligned / trimmed) * 100
                    aligned_trimmed_ratio_list.append(round(ratio, 2))
                else:
                    aligned_trimmed_ratio_list.append(0.0)
            # ==========================================

            # Calculate Exonic Rate (RSeQC Parsing)
            exonic_rates_list = []
            for sample in samples_list:
                rseqc_file = f"{sample}.read_distribution.txt"
                exonic_rate = 0.0
                if os.path.exists(rseqc_file):
                    try:
                        with open(rseqc_file, 'r') as rf:
                            content = rf.read()
                            cds = 0; utr5 = 0; utr3 = 0; total_tags = 0
                            m_cds = re.search(r'CDS_Exons\s+\d+\s+(\d+)', content)
                            if m_cds: cds = int(m_cds.group(1))
                            m_5utr = re.search(r"5'UTR_Exons\s+\d+\s+(\d+)", content)
                            if m_5utr: utr5 = int(m_5utr.group(1))
                            m_3utr = re.search(r"3'UTR_Exons\s+\d+\s+(\d+)", content)
                            if m_3utr: utr3 = int(m_3utr.group(1))
                            m_total = re.search(r'Total Tags\s+(\d+)', content)
                            if m_total: total_tags = int(m_total.group(1))
                            
                            if total_tags > 0:
                                exonic_rate = ((cds + utr5 + utr3) / total_tags) * 100
                                exonic_rate = round(exonic_rate, 2)
                    except Exception as e:
                        print(f"Error parsing RSeQC for {sample}: {e}")
                else:
                    print(f"Warning: RSeQC file {rseqc_file} not found.")
                exonic_rates_list.append(exonic_rate)

            species = re.search(r"RNAseq Species: ([\w\.]+)", log_content).group(1)
            email = re.search(r"RNAseq email: ([\w@.]+)", log_content).group(1)
            adapter_5_prime = re.findall(r'RNAseq_FIVE_PRIME_ADAPTER_\d+=(\w+)', log_content, re.MULTILINE)
            adapter_3_prime = re.findall(r'RNAseq_THREE_PRIME_ADAPTER_\d+=(\w+)', log_content, re.MULTILINE)
            input1_files = re.findall(r'RNAseq_INPUT_FILE1_\d+=.*/([\w.-]+\.fastq\.gz)', log_content, re.MULTILINE)
            input2_files = re.findall(r'RNAseq_INPUT_FILE2_\d+=.*/([\w.-]+\.fastq\.gz)', log_content, re.MULTILINE)

            # Create DataFrame
            data = {
                'Sample': samples_list,
                'Input File1': input1_files,
                'Input File2': input2_files,
                '5\' adapter': adapter_5_prime,
                '3\' adapter': adapter_3_prime,
                'Total Reads': total_reads_list,
                'Trimmed Reads': trimmed_reads_list,
                'Aligned Reads': total_aligned_reads_list,
                'Aligned/Total (%)': aligned_ratio_list,
                'Aligned/Trimmed (%)': aligned_trimmed_ratio_list,
                'Exonic Rate (%)': exonic_rates_list 
            }

            df = pd.DataFrame(data)

            # Chart 1: Read Counts
            df_melted = df.melt(id_vars=['Sample'], 
                                value_vars=['Total Reads', 'Trimmed Reads', 'Aligned Reads'],
                                var_name='Read Type', value_name='Read Counts')
            
            fig = px.bar(df_melted, x='Sample', y='Read Counts', color='Read Type', barmode='group',
                         title='Read Counts Barchart', text='Read Counts')
            fig.update_layout(
                font=dict(family="Arial, sans-serif", size=14),
                xaxis_title=None, yaxis_title=None, showlegend=True,
                margin=dict(l=20, r=20, t=40, b=20)
            )
            readCount_html_barChart = fig.to_html(full_html=False)

            # Chart 2: Exonic Rate QC
            fig_qc = px.bar(df, x='Sample', y='Exonic Rate (%)', 
                            title='Quality Control (Exonic Rate)', 
                            text='Exonic Rate (%)')
            fig_qc.update_traces(marker_color='#2ca02c') 

            fig_qc.add_hline(y=60, line_dash="dash", line_color="green", 
                 annotation_text="PolyA Threshold (>60%)", 
                 annotation_position="top right")
            
            fig_qc.add_hline(y=30, line_dash="dash", line_color="#ff7f0e", 
                 annotation_text="Ribo-zero Threshold (>30%)", 
                 annotation_position="bottom right")
            
            fig_qc.update_layout(
                yaxis_range=[0, 110],
                xaxis_title=None,
                font=dict(family="Arial, sans-serif", size=14),
                bargap=0.6, 
                margin=dict(l=20, r=20, t=40, b=20)
            )
            qc_html_barChart = fig_qc.to_html(full_html=False)

            # Generate HTML Template with Footnote
            template = Template("""
            <!DOCTYPE html>
            <html>
            <head>
                <title>RNA-seq Report</title>
                <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
                <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; font-size: 16px; }
                    h1 { color: #333; text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
                    h2 { color: #333; font-size: 18px; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                    table { width: 100%; text-align: left; table-layout: auto; }
                    table th, table td { text-align: left; vertical-align: middle; }
                    table td { word-wrap: break-word; word-break: break-all; white-space: normal; max-width: 180px; }
                    table th { background-color: white; color: #333; border-bottom: 2px solid #dee2e6; }
                    .meta-container { background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 20px; text-align: center; }
                    .meta-item { display: inline-block; margin: 0 20px; font-size: 16px; }
                    .table-striped tbody tr:nth-of-type(odd) { background-color: rgba(0, 0, 0, 0.05); }
                    .footnote { font-size: 14px; color: #555; margin-top: 15px; padding: 10px; background-color: #f9f9f9; border-left: 4px solid #007bff; }
                    .footnote ol { margin-bottom: 0; padding-left: 20px; }
                    .footnote li { margin-bottom: 5px; }
                </style>
            </head>
            <body>
                <h1>RNA-seq Analysis Report for Job ID: {{ jobID }}</h1>
                
                <div class="meta-container">
                    <span class="meta-item"><strong>Email:</strong> {{ email }}</span>
                    <span class="meta-item"><strong>Species:</strong> {{ species }}</span>
                </div>

                <div class="row">
                    <div class="col-md-8">
                        <div>{{ readCount_html_barChart_content | safe }}</div>
                    </div>
                    <div class="col-md-4">
                        <div>{{ qc_html_barChart_content | safe }}</div>
                    </div>
                </div>
    
                <h2>Data Processing Summary</h2>
                <div class="table-responsive">
                    <table class="table table-striped">
                        {{ table_content }}
                    </table>
                </div>

                <div class="footnote">
                    <strong>Note:</strong>
                    <ol>
                        <li><strong>Exonic Rate & QC Diagnosis:</strong> 
                            <ul>
                                <li><strong>PolyA-selected (>60%):</strong> High exonic rates are expected because this method captures <strong>mature mRNA</strong> (spliced), removing introns.</li>
                                <li><strong>Ribo-depletion (>30%):</strong> Lower exonic rates are normal because this method retains <strong>pre-mRNA and lncRNA</strong>, which contain significant amounts of <strong>intronic sequences</strong>.</li>
                                <li><strong>Warning:</strong> Abnormally low exonic rates (below these thresholds) often indicate <strong>genomic DNA (gDNA) contamination</strong> or severe sample degradation, leading to reads mapping to intergenic regions.</li>
                            </ul>
                        </li>
                    </ol>
                </div>

            </body>
            </html>
            """)

            html_content = template.render(
                jobID=JobIDinput,
                email=email,
                species=species,
                input1_files=input1_files,
                input2_files=input2_files,
                adapter_5_prime=adapter_5_prime,
                adapter_3_prime=adapter_3_prime,
                samples_list=samples_list,
                table_content=df.to_html(classes='table table-striped', index=False, escape=False),
                readCount_html_barChart_content=readCount_html_barChart,
                qc_html_barChart_content=qc_html_barChart
            )

            with open('RNAseq_analysis_report.html', 'w') as f:
                f.write(html_content)

            print("HTML report generated successfully.")
        except Exception as e:
            print(f"An error occurred: {e}")

    def fastq_length_distribution(self, input1):
        with open(input1, 'r+') as f1:
            list1 = []
            dict_read_length = {}
            for line1 in f1:
                if line1[0] == '@':
                    if len(list1) == 4:
                        read_length = len(list1[1])
                        # print(read_length)
                        dict_read_length[read_length] = dict_read_length.get(read_length, 0)
                        dict_read_length[read_length] += 1
                    list1 = []
                    list1.append(line1.strip())
                else:
                    list1.append(line1.strip())
        f2 = pd.DataFrame.from_dict(dict_read_length, orient='index')
        f2.rename(columns={0: input1}, inplace=True)
        f2.reset_index(inplace=True)
        f2.sort_values(by=['index'], ascending=True, inplace=True)
        f2.to_csv(input1.replace('fastq', 'csv').replace('fq', 'csv'), index=False)
        sns.set(style="darkgrid", rc={'figure.figsize': (20, 10)})
        sns.set(font_scale=2)
        sns.lineplot(x='index', y=f'{input1}', data=f2)
        plt.savefig(f"{input1}.pdf")

    def fasta_length_distribution(self, input1):
        with open(input1, 'r+') as f1:
            dict_read_length = {}
            for line1 in f1:
                if line1[0] != '>':
                    read_length = len(line1.strip())
                    dict_read_length[read_length] = dict_read_length.get(read_length, 0)
                    dict_read_length[read_length] += 1
        f2 = pd.DataFrame.from_dict(dict_read_length, orient='index')
        f2.reset_index(inplace=True)
        f2.rename(columns={0: input1, 'index': 'length'}, inplace=True)
        f2.sort_values(by=['length'], ascending=True, inplace=True)
        f2.to_csv(input1.replace('fasta', 'csv'), index=False)
        print(f2)
        sns.set(style="darkgrid", rc={'figure.figsize': (20, 10)})
        sns.set(font_scale=2)
        sns.lineplot(x='length', y=f'{input1}', data=f2)
        plt.savefig(f"{input1}.pdf")

    def all_miRNA_abundance_1st_18th(self, input_file, microRNA_database):
        miRNA_seq_name_dict = Database().microRNA_sequence_to_name_database_1st_18nt(input=microRNA_database)

        # Output file names
        output_Isoform_file = input_file.replace(".CutUMI.fasta", "").replace(".fasta", "") + f'.Isoform_mirnaCount.csv'
        output_total_file = input_file.replace(".CutUMI.fasta", "").replace(".fasta", "") + f'.miRNA_totalCount.csv'

        miRNA_abundance_dict1 = dict()
        with open(input_file) as f1:
            for line1 in f1:
                if (line1[:18] in miRNA_seq_name_dict) and (len(line1.strip()) <= 30):  # miRNA length less than 30bp
                    each_miRNA_isoform_sequence = line1.strip()
                    each_miRNA_name1_rawseq = miRNA_seq_name_dict[line1[:18]]
                    miRNA_names = re.findall(r'(?:hsa|mmu|cel|dme|AQ-Spike)[^&]+', each_miRNA_name1_rawseq)
                    each_miRNA_name1 = '&'.join(miRNA_names)  # Join miRNA names with '&'
                    mirnaName_isoformSequence = each_miRNA_name1 + "_" + each_miRNA_isoform_sequence
                    miRNA_abundance_dict1[mirnaName_isoformSequence] = miRNA_abundance_dict1.get(
                        mirnaName_isoformSequence, 0) + 1

        df = pd.DataFrame.from_dict(miRNA_abundance_dict1, orient='index', columns=['rawCount']).reset_index()
        output_file_basename = os.path.basename(output_Isoform_file)

        # Split 'index' into 'miRNA_name' and 'Sequence' columns
        df[['miRNA_name', 'Sequence']] = df['index'].str.split('_', n=1, expand=True)
        sample_column_name = output_file_basename.replace(".Isoform_mirnaCount.csv", "")

        # Reorder and rename columns
        df = df[['miRNA_name', 'Sequence', 'rawCount']]
        df.columns = ['miRNA_name', 'Sequence', f'{sample_column_name}']

        # Write the isoform counts to the Isoform_mirnaCount.csv file
        df.to_csv(f'{output_Isoform_file}', index=False)

        # Aggregate counts per miRNA_name to get total counts
        df_total = df.groupby('miRNA_name')[sample_column_name].sum().reset_index()

        # Write the total counts to the miRNA_totalCount.csv file
        df_total.to_csv(f'{output_total_file}', index=False)

class Target_analysis:
    def __init__(self):
        pass

    def extract_genes_and_contextScore(self, raw_str):
        """ Human/Mouse/Fly: extract "Gene:Score", return {Gene: Score} """
        dict_gene_context_score = {}
        if str(raw_str) != 'nan':
            items = str(raw_str).split(';')
            for item in items:
                if ':' in item:
                    parts = item.split(':')
                    gene = parts[0].strip()
                    score = parts[1].strip()
                    dict_gene_context_score[gene] = score
        return dict_gene_context_score

    def extract_genes_only(self, raw_str):
        """C.elegans or CLASH: only extract "Gene;Gene" ，return {Gene}"""
        genes_set = set()
        if str(raw_str) != 'nan':
            genes_set = {x.strip() for x in str(raw_str).split(';') if x.strip()}
        return genes_set

    def convert_variable_to_gene_set(self, input_data):  # Helper function: Convert any input (Dict, Set, None) to a clean Set of genes
        if input_data is None:
            return set()
        if isinstance(input_data, dict):
            return set(input_data.keys())
        if isinstance(input_data, set):
            return input_data
        if isinstance(input_data, list):
            return set(input_data)
        return set()

    def get_top_percentage_genes(self, gene_score_dict, percentage=0.25):
        """ top 25%  the most repressed miRNA's target based on context score """
        if not gene_score_dict or not isinstance(gene_score_dict, dict):
            return set()
        try:
            sorted_items = sorted([(k, float(v)) for k, v in gene_score_dict.items()], key=lambda x: x[1], reverse=False)
        except ValueError:
            print("⚠️ Error converting scores to float. Returning empty set.")
            return set()

        cutoff_index = int(len(sorted_items) * percentage)
        if cutoff_index < 1:
            return set()

        top_genes = {item[0] for item in sorted_items[:cutoff_index]}
        return top_genes

    def Cumulative_fraction_curve(self, DeseqInput="", BaseMeanFilterNumber="100", miRNAinput="", outputFile="", species="", seed="", advanced="no"):
        try:
            print(f"Starting Analysis -> Species: {species}, Name: {miRNAinput}, Seed: {seed}")
            if species == "Human":
                f_targetScan = pd.read_table(
                    "/pubapps/mingyi.xie/clashhub/prod/app/CummulativeCruve_TargetInfo/TargetScan/20251215_Human_Targets_From_TargetScan.txt", sep='\t')
                f_CLASH = pd.read_table(
                    "/pubapps/mingyi.xie/clashhub/prod/app/CummulativeCruve_TargetInfo/CLASH/20260218_Human_Targets_From_CLASH.txt", sep='\t')

            elif species == "Mouse":
                f_targetScan = pd.read_table(
                    "/pubapps/mingyi.xie/clashhub/prod/app/CummulativeCruve_TargetInfo/TargetScan/20251215_Mouse_Targets_From_TargetScan.txt", sep='\t')
                f_CLASH = pd.read_table(
                    "/pubapps/mingyi.xie/clashhub/prod/app/CummulativeCruve_TargetInfo/CLASH/20260218_Mouse_Targets_From_CLASH.txt", sep='\t')

            elif species == "Drosophila":
                f_targetScan = pd.read_table(
                    "/pubapps/mingyi.xie/clashhub/prod/app/CummulativeCruve_TargetInfo/TargetScan/20251215_Fly_Targets_From_TargetScan.txt", sep='\t')
                f_CLASH = pd.read_table(
                    "/pubapps/mingyi.xie/clashhub/prod/app/CummulativeCruve_TargetInfo/CLASH/20260218_Drosophila_Targets_From_CLASH.txt", sep='\t')

            elif species == "C.elegans":
                f_targetScan = pd.read_table(
                    "/pubapps/mingyi.xie/clashhub/prod/app/CummulativeCruve_TargetInfo/TargetScan/20251215_Worm_Targets_From_TargetScan.txt", sep='\t')
                f_CLASH = pd.read_table(
                    "/pubapps/mingyi.xie/clashhub/prod/app/CummulativeCruve_TargetInfo/CLASH/20260218_Celegans_Targets_From_CLASH.txt", sep='\t')

            targetScan_Conserved_targets_Base = None
            targetScan_all_targets_Base = None

            CLASH_Conserved_targetsSet = set()
            CLASH_all_targetsSet = set()

            # purpose of context score
            targetScan_Conserved_Top25_targetsSet = set()
            targetScan_All_Top25_targetsSet = set()

            targetScan_Conserved_Top25_Overlap_CLASH_targetsSet = set()
            targetScan_All_Top25_Overlap_CLASH_targetsSet = set()

            MIN_TARGET_THRESHOLD_NUM = 10
            HAS_CONTEXT_SCORE = (species != "C.elegans")

            # Set Top Percentage for Labeling
            TOP_PERCENTAGE = 0.25
            TOP_PCT_LABEL = int(TOP_PERCENTAGE * 100)  # e.g., 25

            ## Part 1. TargetScan Targets
            if seed and seed in f_targetScan['miRNA_seed'].values:
                print(f"✅ {species} Seed [{seed}] found in TargetScan file.")
                target_row = f_targetScan[f_targetScan['miRNA_seed'] == seed].iloc[0]

                # --- A. Conserved Targets ---
                conserved_count_targetScan = float(target_row['conserved_count']) if pd.notna(target_row['conserved_count']) else 0

                if conserved_count_targetScan >= MIN_TARGET_THRESHOLD_NUM:
                    if HAS_CONTEXT_SCORE:
                        # Human/Mouse/Fly:  {Gene: Score}
                        targetScan_Conserved_targets_Base = self.extract_genes_and_contextScore(target_row['conserved_targets_context_scores'])
                    else:
                        # C.elegans: {Gene}，column name is 'conserved_targets_list'
                        targetScan_Conserved_targets_Base = self.extract_genes_only(target_row['conserved_targets_list'])

                    print(f"   -> Conserved targets loaded (Count: {int(conserved_count_targetScan)})")
                else:
                    print(
                        f"⚠️ [Skip] TargetScan Conserved count ({int(conserved_count_targetScan)}) < {MIN_TARGET_THRESHOLD_NUM}. Skipped extraction.")

                # --- B. Total (All) Targets ---
                total_count_targetScan = float(target_row['total_count']) if pd.notna(target_row['total_count']) else 0

                if total_count_targetScan >= MIN_TARGET_THRESHOLD_NUM:
                    if HAS_CONTEXT_SCORE:
                        # Human/Mouse/Fly: {Gene: Score}
                        targetScan_all_targets_Base = self.extract_genes_and_contextScore(
                            target_row['total_targets_context_scores'])
                    else:
                        # C.elegans: {Gene}，column name is 'total_targets_list'
                        targetScan_all_targets_Base = self.extract_genes_only(target_row['total_targets_list'])

                    print(f"   -> All targets loaded (Count: {int(total_count_targetScan)})")
                else:
                    print(
                        f"⚠️ [Skip] TargetScan Total count ({int(total_count_targetScan)}) < {MIN_TARGET_THRESHOLD_NUM}. Skipped extraction.")
            else:
                print(f"❌ Warning: Seed [{seed}] not found in {species} TargetScan file columns.")

            ## Part 2. CLASH Targets (Aggregating all family members by Seed)
            if seed and seed in f_CLASH['miRNA_seed'].values:
                print(f"✅ {species} Seed [{seed}] found in CLASH file. Extracting and merging all family members.")
                
                # Extract ALL rows that share this seed (instead of just iloc[0])
                clash_rows = f_CLASH[f_CLASH['miRNA_seed'] == seed]

                # Merge all target sets across the entire miRNA family
                for _, row in clash_rows.iterrows():
                    # Update Conserved Targets Set
                    if pd.notna(row['CLASH_conserved_targets']) and str(row['CLASH_conserved_targets']).strip() != "None":
                        CLASH_Conserved_targetsSet.update(self.extract_genes_only(row['CLASH_conserved_targets']))
                    
                    # Update Total Targets Set
                    if pd.notna(row['CLASH_total_targets']) and str(row['CLASH_total_targets']).strip() != "None":
                        CLASH_all_targetsSet.update(self.extract_genes_only(row['CLASH_total_targets']))

                # --- Check Thresholds AFTER merging the family ---
                if len(CLASH_Conserved_targetsSet) >= MIN_TARGET_THRESHOLD_NUM:
                    print(f"   -> CLASH Conserved merged loaded (Count: {len(CLASH_Conserved_targetsSet)})")
                else:
                    print(f"⚠️ [Skip] CLASH Conserved merged count ({len(CLASH_Conserved_targetsSet)}) < {MIN_TARGET_THRESHOLD_NUM}. Skipped extraction.")
                    CLASH_Conserved_targetsSet = set() # Reset to empty if threshold failed

                if len(CLASH_all_targetsSet) >= MIN_TARGET_THRESHOLD_NUM:
                    print(f"   -> CLASH Total merged loaded (Count: {len(CLASH_all_targetsSet)})")
                else:
                    print(f"⚠️ [Skip] CLASH Total merged count ({len(CLASH_all_targetsSet)}) < {MIN_TARGET_THRESHOLD_NUM}. Skipped extraction.")
                    CLASH_all_targetsSet = set() # Reset to empty if threshold failed

            else:
                print(f"⚠️ Warning: Seed [{seed}] not found in {species} CLASH file.") 

            ## Part 3. Top 25% filter (Human, mouse, Fly based on Context Score)

            if HAS_CONTEXT_SCORE:
                print("\n--- Starting Advanced Context Score Analysis (Top 25%) ---")

                # --- A. Conserved Top 25% ---
                # attention：get_top_percentage_genes only input dict
                if targetScan_Conserved_targets_Base and isinstance(targetScan_Conserved_targets_Base, dict) and len(targetScan_Conserved_targets_Base) >= MIN_TARGET_THRESHOLD_NUM:
                    temp_top25_conserved = self.get_top_percentage_genes(targetScan_Conserved_targets_Base, percentage=TOP_PERCENTAGE)

                    if len(temp_top25_conserved) >= MIN_TARGET_THRESHOLD_NUM:
                        targetScan_Conserved_Top25_targetsSet = temp_top25_conserved
                        print(f"✅ TargetScan Conserved Top 25% loaded (Count: {len(targetScan_Conserved_Top25_targetsSet)})")

                        # Overlap Check
                        if len(CLASH_Conserved_targetsSet) > 0:
                            overlap_set = targetScan_Conserved_Top25_targetsSet.intersection(CLASH_Conserved_targetsSet)
                            if len(overlap_set) >= MIN_TARGET_THRESHOLD_NUM:
                                targetScan_Conserved_Top25_Overlap_CLASH_targetsSet = overlap_set
                                print(f"✅ Overlap (TS Conserved Top 25% ∩ CLASH) loaded (Count: {len(overlap_set)})")
                            else:
                                print(f"⚠️ [Skip] Overlap Conserved count ({len(overlap_set)}) < Threshold.")
                        else:
                            print("⚠️ [Skip] Overlap skipped (CLASH Conserved empty).")
                    else:
                        print(f"⚠️ [Skip] Top 25% filtering resulted in too few genes (< {MIN_TARGET_THRESHOLD_NUM}).")
                else:
                    print("⚠️ [Skip] Conserved Base set too small or not a dict.")

                # --- B. All Top 25% ---
                if targetScan_all_targets_Base and isinstance(targetScan_all_targets_Base, dict) and len(
                        targetScan_all_targets_Base) >= MIN_TARGET_THRESHOLD_NUM:
                    temp_top25_all = self.get_top_percentage_genes(targetScan_all_targets_Base, percentage=TOP_PERCENTAGE)

                    if len(temp_top25_all) >= MIN_TARGET_THRESHOLD_NUM:
                        targetScan_All_Top25_targetsSet = temp_top25_all
                        print(f"✅ TargetScan All Top 25% loaded (Count: {len(targetScan_All_Top25_targetsSet)})")

                        # Overlap Check
                        if len(CLASH_all_targetsSet) > 0:
                            overlap_set_all = targetScan_All_Top25_targetsSet.intersection(CLASH_all_targetsSet)
                            if len(overlap_set_all) >= MIN_TARGET_THRESHOLD_NUM:
                                targetScan_All_Top25_Overlap_CLASH_targetsSet = overlap_set_all
                                print(f"✅ Overlap (TS All Top 25% ∩ CLASH) loaded (Count: {len(overlap_set_all)})")
                            else:
                                print(f"⚠️ [Skip] Overlap All count ({len(overlap_set_all)}) < Threshold.")
                        else:
                            print("⚠️ [Skip] Overlap skipped (CLASH All empty).")
                    else:
                        print(f"⚠️ [Skip] Top 25% filtering resulted in too few genes (< {MIN_TARGET_THRESHOLD_NUM}).")
                else:
                    print("⚠️ [Skip] All Targets Base set too small or not a dict.")

            else:
                # C.elegans no context score
                print(f"\n⚠️ [Info] Skipping Top 25% Context Score Analysis for {species} (Score data not available).")
                print("   Only Base sets (All/Conserved) will be plotted.")

            # ==============================================================================
            # Part 4: DESeq2 Data Processing (Modified for Error Handling)
            # ==============================================================================
            try:
                f_DeSeq2Result = pd.read_csv(DeseqInput)
            except Exception as e:
                print(f"❌ Error reading CSV file: {e}")
                return

            # --- [Check for missing columns immediately] ---
            # Remove any leading/trailing spaces from column names just in case
            f_DeSeq2Result.columns = f_DeSeq2Result.columns.str.strip()
            
            required_columns = {'GeneName', 'baseMean', 'log2FoldChange'}
            missing_columns = required_columns - set(f_DeSeq2Result.columns)

            if missing_columns:
                print(f"❌ Critical Error: Input CSV is missing required columns: {missing_columns}")
                print("   -> Generating an error notification SVG instead of crashing.")
                
                fig_err, ax_err = plt.subplots(figsize=(8, 6))
                error_msg = (f"Analysis Failed for: {miRNAinput}\n\n"
                             f"Input CSV is missing required columns:\n"
                             f"{', '.join(missing_columns)}\n\n"
                             f"Please check your file header.\n"
                             f"Required: GeneName, baseMean, log2FoldChange")
                
                ax_err.text(0.5, 0.5, error_msg, 
                           horizontalalignment='center', verticalalignment='center', 
                           fontsize=14, color='red', weight='bold')
                ax_err.set_axis_off() 
                
                error_output_name = f"{outputFile}_CumulativeFractionCurve_Standard.svg"
                plt.savefig(error_output_name, format='svg', bbox_inches='tight')
                print(f"✅ Generated Error Plot: {error_output_name}")
                plt.close(fig_err)

                try:
                    error_df = pd.DataFrame({
                        "Analysis_Status": ["Failed"],
                        "Error_Reason": ["Input CSV missing required columns"],
                        "Missing_Columns": [str(missing_columns)],
                        "Required_Columns": ["GeneName, baseMean, log2FoldChange"],
                        "Action": ["Please check your input file format and try again."]
                    })
                    error_csv_name = f"{outputFile}_merged_targets_data.csv"
                    error_df.to_csv(error_csv_name, index=False)
                    print(f"✅ Generated Error Report CSV: {error_csv_name}")
                except Exception as e:
                    print(f"⚠️ Could not generate error CSV: {e}")

                return  # <--- 停止后续运行

            # If columns exist, proceed as normal
            # Sort by baseMean descending to keep the most abundant entry for duplicates
            f_DeSeq2Result_sorted = f_DeSeq2Result.sort_values(by="baseMean", ascending=False)

            # Remove duplicates in 'GeneName', keeping the one with the highest baseMean
            f_DeSeq2Result_deduplicated = f_DeSeq2Result_sorted.drop_duplicates(subset="GeneName", keep="first")

            # Set GeneName as index
            f_DeSeq2Result_indexed = f_DeSeq2Result_deduplicated.set_index("GeneName")

            # Clean Gene Names (Remove 'ID:' prefix common in Drosophila, e.g., "18SrRNA-Psi:CR41602" -> "CR41602")
            f_DeSeq2Result_indexed.index = f_DeSeq2Result_indexed.index.astype(str).str.split(':').str[-1]

            # Filter by BaseMean threshold
            f_DeSeq2Result_filtered = f_DeSeq2Result_indexed[f_DeSeq2Result_indexed['baseMean'] >= float(BaseMeanFilterNumber)].copy()

            # Sort again by baseMean and remove any potential duplicate indices
            f_DeSeq2Result_filtered = f_DeSeq2Result_filtered.sort_values(by='baseMean', ascending=False)
            f_DeSeq2Result_filtered = f_DeSeq2Result_filtered[~f_DeSeq2Result_filtered.index.duplicated(keep='first')]

            print(f"✅ DESeq2 data prepared. Total genes passing filter: {len(f_DeSeq2Result_filtered)}")

            # ==============================================================================
            # Part 5: Data Standardization & Plotting Preparation
            # ==============================================================================

            # 1. Define configurations for the TWO separate plots
            plot_configs_Base = [
                ("CLASH identified targets (Conserved)", CLASH_Conserved_targetsSet, "red"),
                ("CLASH identified targets (All)", CLASH_all_targetsSet, "orange"),
                ("TargetScan predicted targets (Conserved)", targetScan_Conserved_targets_Base, "green"),
                ("TargetScan predicted targets (All)", targetScan_all_targets_Base, "blue"),
            ]

            plot_configs_Advanced = [
                (f"Top {TOP_PCT_LABEL}% predicted targets (TargetScan Conserved)", targetScan_Conserved_Top25_targetsSet,
                 "darkgreen"),
                (f"Top {TOP_PCT_LABEL}% predicted targets (TargetScan All)", targetScan_All_Top25_targetsSet, "darkblue"),
                (f"High-confidence targets (TS Conserved Top{TOP_PCT_LABEL}% ∩ CLASH)",
                 targetScan_Conserved_Top25_Overlap_CLASH_targetsSet, "purple"),
                (f"High-confidence targets (TS All Top{TOP_PCT_LABEL}% ∩ CLASH)",
                 targetScan_All_Top25_Overlap_CLASH_targetsSet, "magenta")
            ]

            # 2. Identify "Non-targets" (Background) based on ALL potential targets
            all_potential_targets_union = set()
            all_configs_combined = plot_configs_Base + plot_configs_Advanced

            # --- [修正点] 这里的变量名之前写错了，现在统一为 data_variable ---
            for label, data_variable, color in all_configs_combined:
                gene_set = self.convert_variable_to_gene_set(data_variable)
                all_potential_targets_union.update(gene_set)

            # Extract Non-targets dataframe
            f_non_targets = f_DeSeq2Result_filtered.loc[
                ~f_DeSeq2Result_filtered.index.isin(all_potential_targets_union)].copy()
            f_non_targets = f_non_targets.sort_values(by='log2FoldChange')

            # --- Robust Length Calculation for Non-targets ---
            # Using (arange(N) / N) guarantees exact length match
            n_non_targets = len(f_non_targets)
            if n_non_targets > 0:
                f_non_targets['order'] = np.arange(n_non_targets) / n_non_targets

            f_non_targets['TargetType'] = 'Non-targets'
            print(f"   -> Non-targets identified: {len(f_non_targets)}")

            # ==============================================================================
            # Part 6: Generate DataFrames & CSV
            # ==============================================================================

            processed_dataframes_map = {}
            # [New] Dictionary to record skipped labels and their counts for the footer note
            skipped_counts_map = {} 
            
            all_dataframes_for_csv = []

            # Process ALL configurations (Base + Advanced)
            for label, data_variable, color in all_configs_combined:
                current_gene_set = self.convert_variable_to_gene_set(data_variable)
                # Only consider genes that actually exist in the DESeq2 results
                valid_genes_in_deseq = [g for g in current_gene_set if g in f_DeSeq2Result_filtered.index]
                
                count_valid = len(valid_genes_in_deseq)

                # Dynamic Threshold Check
                if count_valid >= MIN_TARGET_THRESHOLD_NUM:
                    # Extract data
                    subset_df = f_DeSeq2Result_filtered.loc[valid_genes_in_deseq].dropna(how="all").copy()
                    subset_df = subset_df.sort_values(by='log2FoldChange')

                    # --- Robust Length Calculation for Subsets ---
                    n_subset = len(subset_df)
                    if n_subset > 0:
                        subset_df['order'] = np.arange(n_subset) / n_subset
                    else:
                         subset_df['order'] = [] 

                    subset_df['TargetType'] = label
                    subset_df['LineColor'] = color

                    # Store result
                    processed_dataframes_map[label] = subset_df
                    all_dataframes_for_csv.append(subset_df)
                    print(f"   -> Prepared data for: {label} (Count: {len(subset_df)})")
                else:
                    # [Modified] If count is insufficient, record it to display a note on the plot later
                    if count_valid > 0:
                        print(f"⚠️ [Skip] {label}: Count {count_valid} < {MIN_TARGET_THRESHOLD_NUM}")
                        skipped_counts_map[label] = count_valid
                    else:
                        # Even if 0, record it to show n=0
                        skipped_counts_map[label] = 0

            # Add Non-targets to CSV list
            all_dataframes_for_csv.append(f_non_targets)

            # Save Merged CSV
            if all_dataframes_for_csv:
                merged_dataframe = pd.concat(all_dataframes_for_csv, axis=0)
                merged_dataframe.reset_index(drop=False, inplace=True)
                merged_dataframe.to_csv(f"{outputFile}_merged_targets_data.csv", index=False)
                print(f"✅ Saved merged data to: {outputFile}_merged_targets_data.csv")

            # ==============================================================================
            # Part 7: Loop Plotting (Base & Advanced)
            # ==============================================================================

            plotting_tasks = [{"name": "Standard", "configs": plot_configs_Base}]

            if advanced == 'yes':
                print("✅ Advanced Analysis requested. Adding Advanced plot task.")
                plotting_tasks.append({"name": "Stringent", "configs": plot_configs_Advanced})
            else:
                print("ℹ️ Advanced Analysis NOT requested. Skipping Advanced plot.")

            for task in plotting_tasks:
                plot_name = task['name']
                current_configs = task['configs']

                valid_dfs_to_plot = []
                skipped_notes_for_this_plot = []

                for label, _, _ in current_configs:
                    if label in processed_dataframes_map:
                        valid_dfs_to_plot.append(processed_dataframes_map[label])
                    elif label in skipped_counts_map:
                        count = skipped_counts_map[label]
                        short_label = label.replace("identified targets", "").replace("predicted targets", "").strip()
                        skipped_notes_for_this_plot.append(f"{short_label} (n={count})")

                fig, ax = plt.subplots(figsize=(8, 11)) 
                fig.subplots_adjust(left=0.15, right=0.95, top=0.88, bottom=0.35)

                if valid_dfs_to_plot:
                    for df in valid_dfs_to_plot:
                        p_value = 1.0
                        try:
                            stat, p_value = mannwhitneyu(df['log2FoldChange'], f_non_targets['log2FoldChange'])
                        except:
                            pass
                        label_text = f"{df['TargetType'].iloc[0]} ({len(df)})"
                        if p_value < 0.0001:
                            label_text += f" P: {p_value:.2e}"
                        else:
                            label_text += f" P: {p_value:.4f}"

                        sns.lineplot(data=df, x='log2FoldChange', y='order', color=df['LineColor'].iloc[0],
                                     linewidth=2, linestyle='solid', label=label_text, errorbar=None, ax=ax)
                else:
                    print(f"ℹ️ Info: No specific target groups passed the threshold for [{plot_name}]. Only plotting background.")
                if len(f_non_targets) > 0:
                    sns.lineplot(data=f_non_targets, x='log2FoldChange', y='order', color='black',
                                 linewidth=2, linestyle='solid', label=f'Non-targets ({len(f_non_targets)})', errorbar=None,
                                 ax=ax)
                else:
                    ax.text(0.5, 0.5, "No Data Available", ha='center', va='center', fontsize=16)

                sns.despine()
                ax.set_xlim(-1.5, 1.5)
                ax.set_ylim(0, 1.1)
                ax.set_xlabel('Fold change (log2)', fontsize=15)
                ax.set_ylabel('Cumulative fraction', fontsize=15)

                title_text = f"miRNA: {miRNAinput}"
                if seed: title_text += f" (Seed: {seed})"
                wrapped_title = "\n".join(textwrap.wrap(title_text, width=45))

                fig.text(0.1, 0.96, wrapped_title, ha='left', va='top', fontsize=14, weight='bold')
                fig.text(0.1, 0.90, f"BaseMean: {BaseMeanFilterNumber} | {plot_name}", ha='left', va='top', fontsize=12)

                # Legend
                legend = ax.legend(
                    loc='upper center',
                    bbox_to_anchor=(0.5, -0.20),
                    bbox_transform=ax.transAxes,
                    ncol=1,
                    fontsize=11,
                    frameon=False
                )
                if skipped_notes_for_this_plot:
                    note_text = f"Exclusion Note (<{MIN_TARGET_THRESHOLD_NUM}): " + "; ".join(skipped_notes_for_this_plot)
                    wrapped_note = "\n".join(textwrap.wrap(note_text, width=70))
                    fig.text(0.5, 0.02, wrapped_note, 
                             ha='center', va='bottom', 
                             fontsize=10, color='gray', style='italic')

                ax.tick_params(axis='both', which='major', labelsize=14)

                final_output_name = f"{outputFile}_CumulativeFractionCurve_{plot_name}.svg"
                plt.savefig(final_output_name, format='svg', bbox_inches='tight')
                print(f"✅ Generated Plot: {final_output_name}")
                plt.close(fig)

        except Exception as e:
            print("❌ An unexpected error occurred during execution.")
            traceback.print_exc()
            try:
                fig_fatal, ax_fatal = plt.subplots(figsize=(8, 6))
                err_msg = f"System Error during Analysis\n\nError Details:\n{str(e)[:100]}..." # Truncate if too long
                ax_fatal.text(0.5, 0.5, err_msg, ha='center', va='center', fontsize=12, color='red')
                ax_fatal.set_axis_off()
                emergency_svg = f"{outputFile}_CumulativeFractionCurve_Standard.svg"
                plt.savefig(emergency_svg, format='svg', bbox_inches='tight')
                print(f"✅ Generated Emergency Error Plot: {emergency_svg}")
                plt.close(fig_fatal)
            except:
                print("Failed to generate emergency error plot.")
            try:
                err_df = pd.DataFrame({"Error": ["Unexpected System Error"], "Details": [str(e)]})
                emergency_csv = f"{outputFile}_merged_targets_data.csv"
                err_df.to_csv(emergency_csv, index=False)
                print(f"✅ Generated Emergency Error CSV: {emergency_csv}")
            except:
                print("Failed to generate emergency error CSV.")
            sys.exit(0)

if __name__ == "__main__":
    # print('This script is edited by Lu Li from Mingyi Xie Lab, University of Florida')
    def command_line():
        argv_step_command = sys.argv[1]
        argv = sys.argv[2:]
        try:
            if argv_step_command == 'making_unique_redundant_database_hg38':
                opts, args = getopt.getopt(argv, 'i:', ['input='])  # getopt.getopt(args, shortopts, longopts=[])
                input_martquery_database = opts[0][1]
                print(input_martquery_database)
                Database().making_unique_redundant_database_hg38(input=input_martquery_database)  # step 1
            elif argv_step_command == 'making_unique_redundant_database_mm39':
                opts, args = getopt.getopt(argv, 'i:', ['input='])  # getopt.getopt(args, shortopts, longopts=[])
                input_martquery_database = opts[0][1]
                print(input_martquery_database)
                Database().making_unique_redundant_database_mm39(input=input_martquery_database)  # step

            elif argv_step_command == 'making_unique_redundant_database_WBcel235':
                opts, args = getopt.getopt(argv, 'i:', ['input='])  # getopt.getopt(args, shortopts, longopts=[])
                input_martquery_database = opts[0][1]
                print(input_martquery_database)
                Database().making_unique_redundant_database_WBcel235(input=input_martquery_database)  # step 1

            elif argv_step_command == 'FASTQ_length_distribution':
                opts, args = getopt.getopt(argv, 'i:', ['input=', ])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-i':
                        input_file1 = opt[1]
                        print(input_file1)
                print(opts)
                Statistic().fastq_length_distribution(input1=input_file1)
            elif argv_step_command == 'FASTA_length_distribution':
                opts, args = getopt.getopt(argv, 'i:', ['input=', ])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-i':
                        input_file1 = opt[1]
                        print(input_file1)
                print(opts)
                Statistic().fasta_length_distribution(input1=input_file1)

            elif argv_step_command == 'all_miRNA_abundance_1st_18th':
                opts, args = getopt.getopt(argv, 'i:d:l:', ['input=', 'miRNA_database=',
                                                            'longest_isoform_length'])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-i':
                        input_file1 = opt[1]
                    elif opt[0] == '-d':
                        database1 = opt[1]
                print(opts)
                print(
                    f"miRNA abundance criteria:\n1. The top 18 nts of miRNA in the beginning of reads\n2. The reads length are between 18 nts to 30bp\n")
                Statistic().all_miRNA_abundance_1st_18th(input_file=input_file1, microRNA_database=database1)

            elif argv_step_command == 'making_simple_BedGraph':
                opts, args = getopt.getopt(argv, 'i:c:',
                                           ['input=', 'chromosome='])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-i':
                        input_bedGraph = opt[1]
                    elif opt[0] == '-c':
                        chr_name = opt[1]
                print(input_bedGraph)
                print(opts)
                BedGraph().making_simple_version(file=input_bedGraph, chromosome_name=chr_name)  # step 3
            elif argv_step_command == 'making_transcript_sequence_genomeposition_conservation_database':
                opts, args = getopt.getopt(argv, 'g:t:c:', ['genome_database=', 'transcript_database=',
                                                            'chromosome='])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-g':
                        genome_database = opt[1]
                    elif opt[0] == '-t':
                        transcript_database = opt[1]
                    elif opt[0] == '-c':
                        chromosome = opt[1]
                print(opts)
                Database().making_transcript_sequence_genomeposition_conservation_database(
                    genome_file=genome_database, transcript_file=transcript_database, chr_name=chromosome)  # step 4
            elif argv_step_command == 'Viennad_to_Table':
                opts, args = getopt.getopt(argv, 't:c:i:n:p:',
                                           ['transcirpt_database=', 'transcript_ConservationScore_database=',
                                            'viennad=', 'name_database=','premiRNA_database'])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-c':
                        transcript_CS = opt[1]
                    elif opt[0] == '-t':
                        transcript_DB = opt[1]
                    elif opt[0] == '-i':
                        input1 = opt[1]
                    elif opt[0] == '-n':
                        Name_database1 = opt[1]
                    elif opt[0] == '-p':
                        premiRNA_database1 = opt[1]
                print(f"Current Working Directory: {os.getcwd()}")
                print(opts)
                try:
                    print("step I: convert Viennad to table and calculate conservation score, ~5 minutes")

                    Viennad_to_table(transcript_ConservationScore_database=transcript_CS,
                                     transcript_only_database=transcript_DB).input_viennad(file=input1)
                    print("\nstep II: Compressed table, ~2 minutes, remove dG> -11.1")
                    Compressed_table().files(input=input1)
                    print("\nstep III: Analyze potential miRNAs that have been incorrectly identified as targets.")
                    Compressed_table().potential_miRNA_identification(input=input1,premiRNA_database=premiRNA_database1) # 如果element 序列比对到premiRNA，那么被认为其为潜在的miRNA而不是 真 target
                    print("\nStep IV: Calculate miRNA binding site position, ~2 minutes")
                    Gene_region(ensemble_database=Name_database1).table(input=input1)
                    print("\nStep V: Change BasePattern to FinalResult, 延长genome position，与target element 位置匹配，不是仅仅包含pairing的position, ~2 minutes")
                    Viennad_to_table().file_Basepattern_FinalResult(inputFile=f"{input1}_region.txt")
                except Exception as e:
                    traceback.print_exc()
                    sys.exit()
            elif argv_step_command == 'Cumulative_fraction_curve_targetScan_CLASH':
                try:
                    # [UPDATE] Added 'A:' and 'advanced=' to getopt to handle the new flag
                    opts, args = getopt.getopt(argv, 'd:b:m:o:s:S:A:', ['DeseqFile=', 'baseMean=', 'miRNA_Name=', 'outputFile=', 'species=', 'seed=', 'advanced='])
                    
                    # Initialize advanced_flag with a default value
                    advanced_flag = 'no' 

                    for opt in opts:
                        if opt[0] == '-d':
                            deseq_CSV1 = opt[1]
                        elif opt[0] == '-b':
                            baseMean1 = opt[1]
                        elif opt[0] == '-m':
                            miRNAname1 = opt[1]
                        elif opt[0] == '-o':
                            outputFile1 = opt[1]
                        elif opt[0] == '-s':
                            species1 = opt[1]
                        elif opt[0] == '-S' or opt[0] == '--seed':
                            seed1 = opt[1]
                        elif opt[0] == '-A' or opt[0] == '--advanced': # [NEW] Capture the flag
                            advanced_flag = opt[1]

                    print(opts)
                    Target_analysis().Cumulative_fraction_curve(DeseqInput=deseq_CSV1, BaseMeanFilterNumber=baseMean1,
                                                                miRNAinput=miRNAname1, outputFile=outputFile1, species=species1, seed=seed1, advanced=advanced_flag)
                except Exception as e:
                    print("An error occurred while running the script:")
                    traceback.print_exc()
                    sys.exit(1)

            elif argv_step_command == 'CLASH_data_report':
                opts, args = getopt.getopt(argv, 'j:o:', ['jobID=', 'Output_filename='])  
                for opt in opts:
                    if opt[0] == '-j':
                        input1 = opt[1]
                    elif opt[0] == '-o':
                        Output1 = opt[1]
                print(opts)
                Statistic().CLASH_data_report(JobID1=input1, Output_filename1=Output1)
            elif argv_step_command == 'rnaseqTPM_merge':
                opts, args = getopt.getopt(argv, 'j:s:',
                                           ['jobID=','Species='])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-j':
                        input1 = opt[1]
                    elif opt[0] == '-s':
                        species_input = opt[1]
                print(opts)
                try:
                    Combined_table().rnaseqTPM_merge(JobID1=input1,species1=species_input)
                except Exception as e:
                    logging.error("Error occurred in command_line function", exc_info=True)
                    sys.exit()
            elif argv_step_command == 'reorder_geneCountFileColumn':
                try:
                    Statistic().reorder_geneCountFileColumn()
                except Exception as e:
                    logging.error("Error occurred in reorder_geneCountFileColumn", exc_info=True)
                    sys.exit()
            elif argv_step_command == 'Deseq2_data_report':
                opts, args = getopt.getopt(argv, 'j:',
                                           ['jobID='])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-j':
                        input1 = opt[1]
                print(opts)
                Statistic().Deseq2_data_report(JobIDinput=input1)

            elif argv_step_command == 'GeneTPM_data_report':
                opts, args = getopt.getopt(argv, 'j:',
                                           ['jobID='])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-j':
                        input1 = opt[1]
                print(opts)
                try:
                    Statistic().GeneTPM_data_report(JobIDinput=input1)
                except Exception as e:
                    logging.error("Error occurred in GeneTPM_data_report", exc_info=True)
                    sys.exit()


            elif argv_step_command == 'aqPE_data_report':
                opts, args = getopt.getopt(argv, 'j:',
                                           ['jobID='])
                for opt in opts:
                    if opt[0] == '-j':
                        input1 = opt[1]
                print(opts)
                try:
                    Statistic().aqPE_data_report(JobID1=input1)
                except Exception as e:
                    logging.error("Error occurred in aqPE_data_report", exc_info=True)
                    sys.exit()
            elif argv_step_command == 'aqSE_data_report':
                opts, args = getopt.getopt(argv, 'j:',
                                           ['jobID='])
                for opt in opts:
                    if opt[0] == '-j':
                        input1 = opt[1]
                print(opts)
                try:
                    Statistic().aqSE_data_report(JobID1=input1)
                except Exception as e:
                    logging.error("Error occurred in aqSE_data_report", exc_info=True)
                    sys.exit()

            elif argv_step_command == 'aqCR_data_report':
                opts, args = getopt.getopt(argv, 'j:',
                                           ['jobID='])
                for opt in opts:
                    if opt[0] == '-j':
                        input1 = opt[1]
                print(opts)
                try:
                    Statistic().aqCR_data_report(JobID1=input1)
                except Exception as e:
                    logging.error("Error occurred in aqCR_data_report", exc_info=True)
                    sys.exit()

            elif argv_step_command == 'Concat_mirnaCount':
                opts, args = getopt.getopt(argv, 'j:',
                                           ['jobID='])  # getopt.getopt(args, shortopts, longopts=[])
                for opt in opts:
                    if opt[0] == '-j':
                        input1 = opt[1]
                print(opts)
                try:
                    Combined_table().Concat_mirnaCount(JobIDinput=input1)
                except Exception as e:
                    logging.error("Error occurred in Concat mirnaCount", exc_info=True)
                    sys.exit()
            elif argv_step_command == 'CLASH_csv_merged_Piranha':
                # getopt processing: -i <csv>, -b <bed>
                opts, args = getopt.getopt(argv, 'i:b:')

                for opt, val in opts:
                    if opt == ('-i'):
                        input_csv = val
                    elif opt == ('-b'):
                        input_bed = val
                # print parsed options
                print("Parsed options:", opts)
                # run CLASH annotation
                try:
                    Viennad_to_table().Annotate_Piranha(CSVinput=input_csv,PeakBED=input_bed)
                except Exception as e:
                    logging.error("Error occurred in CLASH_csv_merged_Piranha", exc_info=True)
                    sys.exit()

            else:
                print('USAGE')
                print('-h [--help]')
                print('python3 CLASHub.py FASTQ_length_distribution -i [--input] <FASTQ>')
                print('python3 CLASHub.py FASTA_length_distribution -i [--input] <FASTA>')
                print('python3 CLASHub.py all_miRNA_abundance_1st_18th -i [--input] <fasta/fastq> -d [--miRNA_database]')
                print('python3 CLASHub.py making_unique_redundant_database_hg38 -i [--input] <TXT>')
                print('python3 CLASHub.py making_unique_redundant_database_mm39 -i [--input] <TXT>')
                print('python3 CLASHub.py making_unique_redundant_database_WBcel235 -i [--input] <TXT>')
                print('python3 CLASHub.py making_simple_BedGraph -i [--input] <TXT> -c chromosome_name')
                print('python3 CLASHub.py making_transcript_sequence_genomeposition_conservation_database -g [--genome_database] -t [--transcript_database] -c [--chromosome]')
                print('python3 CLASHub.py Viennad_to_Table -i [--viennad] <TXT> -c [--transcript_ConservationScore_database] -t [--transcript_database] -n [--name_database]')
                print('python3 CLASHub.py Cumulative_fraction_curve_targetScan_CLASH -d [--DeseqFile] -b [--baseMean] -m [--miRNA_Name] -o [--outputFile] -s [--species] -S [--seed] -A [--advanced]')
                print('python3 CLASHub.py AQ-seq -1 [fastq_1] -2 [fastq_2] -o [fastq_out] -d [miR_database]')
                print('python3 CLASHub.py CLASH_data_report -j [--jobID] -o [--Output_filename]')
                print('python3 CLASHub.py rnaseqTPM_merge -j [--jobID] -s [--Species]')
                print('python3 CLASHub.py reorder_geneCountFileColumn')
                print('python3 CLASHub.py Concat_mirnaCount -j [--jobID]')
                print('python3 CLASHub.py aqPE_data_report -j [--jobID]')
                print('python3 CLASHub.py aqSE_data_report -j [--jobID]')
                print('python3 CLASHub.py aqCR_data_report -j [--jobID]')
                print('python3 CLASHub.py GeneTPM_data_report -j [--jobID]')
                print('python3 CLASHub.py Deseq2_data_report -j [--jobID]')
                print("python3 CLASHub.py CLASH_csv_merged_Piranha -i <input.csv> -b <peaks.bed>")
        except Exception as e:
            traceback.print_exc()
            sys.exit(1)
    command_line()

